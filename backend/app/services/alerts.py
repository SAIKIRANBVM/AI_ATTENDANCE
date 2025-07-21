from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
from typing import List, Optional, Dict, Any
from datetime import datetime
import traceback
import io
import time
import numpy as np

from backend.app.utils.alerts_utils import al_utils

from backend.app.services.filter_service import FilterService
from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.AnalysisResponse import AnalysisResponse
from dataclasses import dataclass
from typing import Optional, Dict, Any
from backend.classes.FilterCriteria import FilterCriteria
from backend.classes.FilterOptions import FilterOptions
from backend.classes.GradeResponse import GradeResponse
from backend.classes.SchoolResponse import SchoolResponse
from backend.classes.GradeRiskResponse import GradeRiskResponse, GradeRiskItem, RiskLevel as GradeRiskLevel
from backend.classes.SchoolRiskResponse import SchoolRiskResponse, SchoolRiskItem, RiskLevel as SchoolRiskLevel
from backend.app.config import get_current_year
from backend.app.data_store import data_store
from backend.app.utils.logger import logger
from backend.app.services.generation_service import GenerationService
from backend.app.services.report_service import ReportService

# Constants for tier and risk level classification
TIER_BINS = [0, 80, 90, 95, 100]
TIER_LABELS = ['Tier 4', 'Tier 3', 'Tier 2', 'Tier 1']
RISK_LEVEL_BINS = [0, 80, 90, 95, 100]
RISK_LEVEL_LABELS = ['Critical', 'High', 'Medium', 'Low']

CURRENT_SCHOOL_YEAR = get_current_year()

def _generate_alerts_notifications(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate alerts notifications based on attendance predictions.
    
    Args:
        df: DataFrame containing student attendance data
        
    Returns:
        Dictionary containing alert notifications grouped by district, school, and grade
    """
    # Use the main Predictions column for all calculations
    if 'Predictions' not in df.columns:
        logger.warning("No 'Predictions' column found in the DataFrame")
        return {
            "totalBelow60": 0,
            "byDistrict": [],
            "bySchool": [],
            "byGrade": []
        }
    
    # Create a mask for students below 60% attendance and ensure it's a numpy array
    mask = (df['Predictions'] < 0.6).values
    total_below_60 = int(mask.sum().item() if hasattr(mask.sum(), 'item') else int(mask.sum()))
    
    # Helper function to safely group and count
    def safe_group_count(data, group_col, count_col='count'):
        if group_col not in data.columns:
            logger.warning(f"Column '{group_col}' not found for grouping")
            return []
            
        try:
            # Convert numpy types to Python native types and handle NaN/None
            counts = data[mask].groupby(group_col).size().reset_index(name=count_col)
            
            result = []
            for _, row in counts.iterrows():
                # Convert numpy types to Python native types
                group_value = row[group_col]
                if hasattr(group_value, 'item'):
                    group_value = group_value.item()
                
                count_value = row[count_col]
                if hasattr(count_value, 'item'):
                    count_value = int(count_value.item())
                else:
                    count_value = int(count_value)
                
                # Handle potential NaN/None values
                if pd.isna(group_value):
                    group_value = None
                    
                result.append({
                    group_col.lower().replace('_name', '').replace('student_', ''): group_value,
                    'count': count_value
                })
                
            return result
            
        except Exception as e:
            logger.error(f"Error grouping by {group_col}: {str(e)}\n{traceback.format_exc()}")
            return []
    
    # Group by district, school, and grade
    by_district = safe_group_count(df, 'DISTRICT_NAME')
    by_school = safe_group_count(df, 'SCHOOL_NAME')
    by_grade = safe_group_count(df, 'STUDENT_GRADE_LEVEL', 'grade')
    
    # Log the results for debugging
    logger.info(f"Generated alerts: {total_below_60} students below 60% attendance")
    logger.info(f"Districts with alerts: {len(by_district)}")
    logger.info(f"Schools with alerts: {len(by_school)}")
    logger.info(f"Grades with alerts: {len(by_grade)}")
    
    return {
        "totalBelow60": total_below_60,
        "byDistrict": by_district,
        "bySchool": by_school,
        "byGrade": by_grade
    }


def get_analysis(search_criteria: FilterCriteria):
    logger.info(f"Received analysis request with criteria: {search_criteria.dict()}")
    
    if not hasattr(data_store, 'df') or data_store.df is None:
        error_msg = 'Data not loaded. Please check if the data file exists and is in the correct format.'
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    if not data_store.is_ready:
        error_msg = 'Data is still being loaded. Please try again shortly.'
        logger.error(error_msg)
        raise HTTPException(status_code=503, detail=error_msg)
        
    try:
        start_time = time.time()
        logger.info("Starting data processing...")
        
        try:
            df = data_store.df.copy() #type:ignore
            if df is None or df.empty:
                raise ValueError("DataFrame is empty or None")
                
            total_students = len(df)
            logger.info(f"Original dataset size: {total_students} rows")
            logger.info(f"Available columns in dataset: {df.columns.tolist()}")
            
            if not df.empty:
                logger.info(f"Sample data (first row): {df.iloc[0].to_dict()}")
                for col in ['DISTRICT_CODE', 'DISTRICT_NAME', 'SCHOOL_CODE', 'SCHOOL_NAME', 'GRADE_CODE', 'GRADE_LEVEL']:
                    if col in df.columns:
                        unique_vals = df[col].dropna().unique()
                        logger.info(f"Found {len(unique_vals)} unique values for {col}. First 5: {unique_vals[:5]}")
            
        except Exception as df_error:
            logger.error(f"Error accessing DataFrame: {str(df_error)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error accessing data: {str(df_error)}")
        
        if any([search_criteria.districtCode, search_criteria.gradeCode, search_criteria.schoolCode]):
            logger.info("Applying filters to dataset...")
            try:
                df = FilterService.filter_data(df, district_code=search_criteria.districtCode, school_code=search_criteria.schoolCode, grade_code=search_criteria.gradeCode).copy()
                logger.info(f"Filtered dataset size: {len(df)} rows")
            except Exception as filter_error:
                logger.error(f"Error in FilterService.filter_data: {str(filter_error)}")
                logger.error(traceback.format_exc())
                raise HTTPException(status_code=400, detail=f"Error applying filters: {str(filter_error)}")
                
        if len(df) == 0:
            error_msg = f'No data found for filters: district={search_criteria.districtCode}, grade={search_criteria.gradeCode}, school={search_criteria.schoolCode}'
            logger.warning(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        total_students = len(df)
        
        # Get attendance data
        if 'Predictions' in df.columns:
            attendance_series = df['Predictions'] * 100
        elif 'Predicted_Attendance' in df.columns:
            attendance_series = df['Predicted_Attendance']
        else:
            raise HTTPException(status_code=500, detail='No attendance data available in the dataset')
        
        # Vectorized operations for tier and risk level assignment
        df['TIER'] = pd.cut(
            attendance_series,
            bins=TIER_BINS,
            labels=TIER_LABELS,
            include_lowest=True,
            right=False
        )
        
        # Generate alerts notifications
        alerts_notifications = _generate_alerts_notifications(df)
        
        df['RISK_LEVEL'] = pd.cut(
            attendance_series,
            bins=RISK_LEVEL_BINS,
            labels=RISK_LEVEL_LABELS,
            include_lowest=True,
            right=False
        )
        
        # Calculate metrics
        tier_counts = df['TIER'].value_counts()
        tier4 = int(tier_counts.get('Tier 4', 0))
        tier3 = int(tier_counts.get('Tier 3', 0))
        tier2 = int(tier_counts.get('Tier 2', 0))
        tier1 = int(tier_counts.get('Tier 1', 0))
        
        below_85_mask = attendance_series < 85
        critical_risk_mask = df['RISK_LEVEL'] == 'Critical'
        below_85_students = int(below_85_mask.sum())
        critical_risk_students = int(critical_risk_mask.sum())
        
        school_prediction = round(df['Predictions_School'].mean() * 100, 1) if 'Predictions_School' in df.columns and not df['Predictions_School'].isna().all() else None
        grade_prediction = round(df['Predictions_Grade'].mean() * 100, 1) if 'Predictions_Grade' in df.columns and not df['Predictions_Grade'].isna().all() else None
        
        summary = SummaryStatistics(
            totalStudents=total_students, below85Students=below_85_students, 
            below85Percentage=below_85_students / total_students * 100 if total_students else 0.0, 
            tier4Students=tier4, tier4Percentage=tier4 / total_students * 100 if total_students else 0.0, 
            tier3Students=tier3, tier3Percentage=tier3 / total_students * 100 if total_students else 0.0, 
            tier2Students=tier2, tier2Percentage=tier2 / total_students * 100 if total_students else 0.0, 
            tier1Students=tier1, tier1Percentage=tier1 / total_students * 100 if total_students else 0.0,
            schoolPrediction=school_prediction, gradePrediction=grade_prediction
        )
        
        insights = GenerationService.generate_insights(df)
        recommendations = GenerationService.generate_recommendations(df)
        logger.info(f'AI analysis completed in {time.time() - start_time:.4f} seconds')
        @dataclass
        class AnalysisResponse:
            summaryStatistics: SummaryStatistics
            keyInsights: List[str]
            recommendations: List[str]
            alertsNotifications: Optional[Dict[str, Any]] = None
        return AnalysisResponse(
            summaryStatistics=summary, 
            keyInsights=insights, 
            recommendations=recommendations,
            alertsNotifications=alerts_notifications
        )
    except Exception as e:
        logger.error(f'Error in get_analysis: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))


def get_filter_options():
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
    
    try:
        df = data_store.df
        district_map = {}
        
        for (district_code, district_name), district_df in df.groupby(['DISTRICT_CODE', 'DISTRICT_NAME']): #type:ignore
            district_code, district_name = str(district_code).strip(), str(district_name).strip()
            schools_in_district = []
            logger.debug(f"Processing district: {district_name} (Code: {district_code})")
            
            for (school_name, location_id), school_df in district_df.groupby(['SCHOOL_NAME', 'LOCATION_ID']):
                school_name, school_code = str(school_name).strip(), str(location_id).strip()
                logger.debug(f"  Processing school: {school_name} (ID: {school_code})")
                
                grades_in_school = []
                for grade in school_df['STUDENT_GRADE_LEVEL'].dropna().unique():
                    grade_str = str(grade).strip()
                    if not grade_str or grade_str.lower() == 'nan':
                        continue
                        
                    grade_entry = {'value': grade_str, 'label': f"Grade {grade_str}", 'school': school_code, 'district': district_code}
                    grades_in_school.append(grade_entry)
                    logger.debug(f"    Added grade: {grade_entry}")
                    
                if not grades_in_school:
                    logger.warning(f"No grades found for school: {school_name} (ID: {school_code})")
                    continue
                
                school_entry = {'value': school_code, 'label': school_name, 'district': district_code, 'district_name': district_name, 'location_id': str(location_id).strip(), 'grades': grades_in_school}
                schools_in_district.append(school_entry)
                logger.debug(f"  Added school: {school_name} (ID: {school_code}) with {len(grades_in_school)} grades")
            
            district_map[district_code] = {'value': district_code, 'label': district_name, 'schools': schools_in_district}
            logger.debug(f"Added district: {district_name} (Code: {district_code}) with {len(schools_in_district)} schools")
        
        districts = [district_map[d] for d in sorted(district_map.keys())]
        flat_districts = [{'value': d['value'], 'label': d['label']} for d in districts]
        
        flat_schools = []
        for district in districts:
            for school in district['schools']:
                flat_schools.append({'value': school['value'], 'label': school['label'], 'districtCode': school['district']})
        
        flat_grades = []
        grade_count = 0
        
        logger.debug("Processing grades for all schools...")
        for district in districts:
            logger.debug(f"  District: {district['label']} ({district['value']})")
            for school in district['schools']:
                school_grade_count = 0
                logger.debug(f"School: {school['label']} ({school['value']})")
                logger.debug(f"Raw grades data: {school.get('grades', [])}")
                
                for grade in school.get('grades', []):
                    grade_value = str(grade.get('value', '')).strip().upper()
                    if not grade_value.startswith('G'):
                        grade_value = f"G{grade_value}"
                    
                    grade_entry = {'value': grade_value, 'label': f"Grade {grade_value.replace('G', '')}", 'schoolCode': school['value'], 'districtCode': district['value']}
                    flat_grades.append(grade_entry)
                    school_grade_count += 1
                    grade_count += 1
                
                logger.debug(f"    Processed {school_grade_count} grades for school {school['label']}")
        
        logger.debug(f"Total grades processed: {grade_count}")
        if flat_grades:
            logger.debug(f"Sample grade entries: {flat_grades[:3]}...")
        else:
            logger.warning("No grades were processed for any school")
        
        result = FilterOptions(districts=flat_districts, schools=sorted(flat_schools, key=lambda x: x['label']), grades=flat_grades) #type:ignore
        logger.debug(f"Returning filter options with {len(flat_districts)} districts, {len(flat_schools)} schools, and {len(flat_grades)} grades")
        logger.debug(f"Sample grades in response: {flat_grades[:3]}")
        return result
    except Exception as e:
        logger.error(f'Error retrieving filter options: {str(e)}')
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f'Error retrieving filter options: {str(e)}')


def download_report(criteria: FilterCriteria, report_type: str):
    try:
        logger.info(f"Starting report generation for type: {report_type}")
        logger.info(f"Filters - District: {criteria.districtCode}, School: {criteria.schoolCode}, Grade: {criteria.gradeCode}")
        
        if not data_store.is_ready:
            raise HTTPException(status_code=503, detail='Data not loaded yet')
            
        df = data_store.df.copy() #type:ignore
        logger.info(f"Initial data shape: {df.shape}")
        
        if any([criteria.districtCode, criteria.gradeCode, criteria.schoolCode]):
            logger.info("Applying filters to data...")
            df = FilterService.filter_data(df, district_code=criteria.districtCode, grade_code=criteria.gradeCode, school_code=criteria.schoolCode)
            logger.info(f"Data shape after filtering: {df.shape}")
        
        if len(df) == 0:
            error_msg = f"No data found for the selected filters. District: {criteria.districtCode}, School: {criteria.schoolCode}, Grade: {criteria.gradeCode}"
            logger.warning(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        if 'Predictions' in df.columns:
            df['Predicted_Attendance'] = df['Predictions'] * 100
        elif 'Predicted_Attendance' not in df.columns:
            logger.error("No attendance data available in the dataset")
            raise HTTPException(status_code=500, detail='No attendance data available in the dataset. Please ensure the data contains either Predictions or Predicted_Attendance column.')
        
        df['TIER'] = df['Predicted_Attendance'].apply(al_utils.assign_tiers)
        
        report_type = report_type.lower()
        logger.info(f"Generating {report_type} report...")
        
        if report_type == 'below_85':
            report_df = df[df['Predicted_Attendance'] < 85].copy()
            logger.info(f"Found {len(report_df)} students with attendance below 85%")
            if len(report_df) == 0:
                raise HTTPException(status_code=404, detail='No students found with attendance below 85% for the selected filters.')
            report_df = report_df.sort_values('Predicted_Attendance')
            report_df = ReportService.generate_detailed_report(report_df)
            filename = f"CAR_REPORT_Chronic_Absenteeism_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'tier1':
            report_df = df[df['TIER'] == 'Tier 1'].copy()
            logger.info(f"Found {len(report_df)} students in Tier 1 (≥95% attendance)")
            if len(report_df) == 0:
                raise HTTPException(status_code=404, detail='No students found in Tier 1 (≥95% attendance) for the selected filters.')
            report_df = report_df.sort_values('Predicted_Attendance', ascending=False)
            report_df = ReportService.generate_detailed_report(report_df)
            filename = f"tier1_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'tier4':
            report_df = df[df['TIER'] == 'Tier 4'].copy()
            logger.info(f"Found {len(report_df)} students in Tier 4 (<80% attendance)")
            if len(report_df) == 0:
                raise HTTPException(status_code=404, detail='No students found in Tier 4 (<80% attendance) for the selected filters.')
            report_df = report_df.sort_values('Predicted_Attendance')
            report_df = ReportService.generate_detailed_report(report_df)
            filename = f"tier4_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'summary':
            report_df = ReportService.generate_summary_report(df)
            filename = f"attendance_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'detailed':
            report_df = ReportService.generate_detailed_report(df)
            filename = f"attendance_detailed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        else:
            error_msg = f'Invalid report type: {report_type}. Valid types are: below_85, tier1, tier4, summary, detailed'
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        output = io.BytesIO()
        report_df.to_excel(output, index=False)
        output.seek(0)
        
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        headers = {'Content-Disposition': f'attachment; filename={filename}', 'Access-Control-Expose-Headers': 'Content-Disposition'}
        
        logger.info(f"Successfully generated {report_type} report with {len(report_df)} rows")
        return StreamingResponse(output, media_type=content_type, headers=headers)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f'Error generating report: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f'An error occurred while generating the report. Please try again later.')


def get_schools(district: Optional[str] = None) -> List[SchoolResponse]:
    if not data_store.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Data is still being loaded. Please try again shortly."
        )

    df = data_store.df

    is_all = district is None or str(district).strip() in {"", "-1"}
    if is_all:
        group_df = (
            df.groupby(["DISTRICT_CODE", "LOCATION_ID", "SCHOOL_NAME"], as_index=False)
              .first()
        )

        return [
            SchoolResponse(
                value=str(row["LOCATION_ID"]).strip(),
                label=str(row["SCHOOL_NAME"]).strip(),
                districtCode=str(row["DISTRICT_CODE"]).strip(),
            )
            for _, row in group_df.iterrows()
        ]

    district = str(district).strip()

    mask = df["DISTRICT_CODE"].astype(str).str.strip() == district
    if not mask.any():                 
        return []                     

    filtered_df = df.loc[mask]

    group_df = (
        filtered_df.groupby(["LOCATION_ID", "SCHOOL_NAME"], as_index=False)
                   .first()
    )

    return [
        SchoolResponse(
            value=str(row["LOCATION_ID"]).strip(),
            label=str(row["SCHOOL_NAME"]).strip(),
            districtCode=district,
        )
        for _, row in group_df.iterrows()
    ]



def get_grades(district: str | None = None, school: str | None = None) -> List[GradeResponse]:
    print(f"Getting grades for district: {district}, school: {school}")
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
        
    try:
        if data_store.df is None:
            raise ValueError("No data available")
            
        df = data_store.df.copy() #type:ignore
        
        if district:
            district = str(district).strip()
            df = df[df['DISTRICT_CODE'].astype(str).str.strip() == district]
            
        if school:
            school = str(school).strip()
            location_id = school.split('-', 1)[1].strip() if '-' in school else school
            logger.debug(f"Filtering grades by school. Input: {school}, Extracted location_id: {location_id}")
            df = df[df['LOCATION_ID'].astype(str).str.strip() == location_id]
            logger.debug(f"Found {len(df)} students matching location_id {location_id}")
        
        if len(df) == 0:
            return []
            
        grade_col = 'STUDENT_GRADE_LEVEL' if 'STUDENT_GRADE_LEVEL' in df.columns else 'GRADE_LEVEL'
        if grade_col not in df.columns:
            raise ValueError(f"Grade column '{grade_col}' not found in data")
        
        logger.debug(f"Available grade values before filtering: {df[grade_col].unique()}")
        
        def normalize_grade_value(grade):
            if pd.isna(grade):
                return None
            grade_str = str(grade).strip()
            if grade_str.upper() in ['PK', 'P', 'PRE-K', 'PREK', 'PRE-KINDERGARTEN']:
                return '-1'
            if grade_str.upper() in ['K', 'KG', 'KINDERGARTEN']:
                return '0'
                
            try:
                import re
                match = re.search(r'\d+', grade_str)
                if match:
                    return match.group(0)
                float_val = float(grade_str)
                return str(int(float_val)) if float_val.is_integer() else grade_str
            except (ValueError, TypeError):
                return grade_str
        
        unique_grades = df[grade_col].dropna().apply(normalize_grade_value).dropna().unique()
        logger.debug(f"Normalized grade values: {unique_grades}")
        
        def grade_sort_key(grade_str):
            if not grade_str or pd.isna(grade_str):
                return (float('inf'), '')
                
            grade_str = str(grade_str).strip()
            
            if grade_str == '-1' or grade_str.upper() in ['PK', 'P', 'PRE-K', 'PREK']:
                return (-1, 'PK')
            if grade_str == '0' or grade_str.upper() in ['K', 'KG']:
                return (0, 'K')
                
            try:
                num = int(grade_str)
                return (num, str(num))
            except (ValueError, TypeError):
                return (float('inf'), grade_str)
        
        return [GradeResponse(value=grade, label='PK' if grade == '-1' else ('K' if grade == '0' else grade), districtCode=district if district else None, schoolCode=school if school else None) for grade in sorted(unique_grades, key=grade_sort_key)]
        
    except Exception as e:
        logger.error(f'Error getting grades: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to retrieve grades: {str(e)}')


def get_grade_risk_data(district: str | None = None, school: str | None = None) -> GradeRiskResponse:
    """
    Get grade-level risk data for the specified district and/or school.
    
    Args:
        district: Optional district code to filter by
        school: Optional school code to filter by
        
    Returns:
        GradeRiskResponse containing risk data by grade level
    """
    logger.info(f"Getting grade risk data for district: {district}, school: {school}")
    
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
        
    try:
        if data_store.df is None:
            raise ValueError("No data available")
            
        df = data_store.df.copy()
        
        # Apply filters
        if district:
            district = str(district).strip()
            df = df[df['DISTRICT_CODE'].astype(str).str.strip() == district]
            
        if school:
            school = str(school).strip()
            location_id = school.split('-', 1)[1].strip() if '-' in school else school
            df = df[df['LOCATION_ID'].astype(str).str.strip() == location_id]
        
        if df.empty:
            return GradeRiskResponse(
                grades=[],
                total_students=0,
                average_risk=0.0,
                average_risk_level=GradeRiskItem.calculate_risk_level(0.0),
                risk_distribution={level: 0 for level in GradeRiskLevel}
            )
            
        # Ensure we have the required columns
        grade_col = 'STUDENT_GRADE_LEVEL'
        if grade_col not in df.columns:
            raise ValueError(f"Required column '{grade_col}' not found in data")
        
        # Determine which prediction column to use (in order of preference)
        prediction_col = None
        for col in ['Predictions', 'Predictions_Grade', 'Predictions_School', 'Predictions_District']:
            if col in df.columns:
                prediction_col = col
                logger.info(f"Using prediction column: {prediction_col}")
                break
                
        if prediction_col is None:
            logger.warning("No prediction columns found, using actual attendance data")
            df['RISK_PERCENTAGE'] = (100 - (df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100).clip(0, 100)).round(2)
        else:
            # Convert prediction to risk percentage (assuming predictions are 0-1 probabilities)
            df['RISK_PERCENTAGE'] = (100 - (df[prediction_col] * 100).clip(0, 100)).round(2)
        
        # Group by grade and calculate statistics
        grade_groups = df.groupby(grade_col).agg({
            'RISK_PERCENTAGE': ['mean', 'count'],
            'STUDENT_ID': 'nunique'
        }).reset_index()
        
        # Flatten column names
        grade_groups.columns = ['_'.join(col).strip('_') for col in grade_groups.columns.values]
        
        # Calculate overall statistics
        total_students = grade_groups['STUDENT_ID_nunique'].sum()
        weighted_avg_risk = (grade_groups['RISK_PERCENTAGE_mean'] * grade_groups['STUDENT_ID_nunique']).sum() / total_students if total_students > 0 else 0
        
        # Format the response with risk levels
        grade_items = []
        risk_distribution = {level: 0 for level in GradeRiskLevel}
        
        for _, row in grade_groups.iterrows():
            grade = str(row[f'{grade_col}']).strip()
            risk_percent = round(float(row['RISK_PERCENTAGE_mean']), 2)
            student_count = int(row['STUDENT_ID_nunique'])
            
            # Normalize grade for display
            if grade.upper() in ['PK', 'P', 'PRE-K', 'PREK', 'PRE-KINDERGARTEN', '-1']:
                grade_display = 'PK'
            elif grade.upper() in ['K', 'KG', 'KINDERGARTEN', '0']:
                grade_display = 'K'
            else:
                # Try to convert to integer for numeric grades
                try:
                    grade_num = int(float(grade))
                    grade_display = str(grade_num)
                except (ValueError, TypeError):
                    grade_display = grade
            
            # Calculate risk level
            risk_level = GradeRiskItem.calculate_risk_level(risk_percent)
            
            grade_items.append(GradeRiskItem(
                grade=grade_display,
                risk_percentage=risk_percent,
                student_count=student_count,
                risk_level=risk_level
            ))
            
            # Update risk distribution
            risk_distribution[risk_level] += 1
        
        # Sort grades: PK, K, then numeric grades
        def grade_sort_key(item: GradeRiskItem):
            if item.grade.upper() == 'PK':
                return (-1, 'PK')
            if item.grade.upper() == 'K':
                return (0, 'K')
            try:
                return (int(item.grade), item.grade)
            except (ValueError, TypeError):
                return (float('inf'), item.grade)
                
        grade_items.sort(key=grade_sort_key)
        
        # Calculate overall average risk level
        avg_risk_rounded = round(weighted_avg_risk, 2)
        avg_risk_level = GradeRiskItem.calculate_risk_level(avg_risk_rounded)
        
        return GradeRiskResponse(
            grades=grade_items,
            total_students=total_students,
            average_risk=avg_risk_rounded,
            average_risk_level=avg_risk_level,
            risk_distribution=risk_distribution
        )
        
    except Exception as e:
        logger.error(f'Error getting grade risk data: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to retrieve grade risk data: {str(e)}')


def get_school_risk_data(district: str | None = None) -> SchoolRiskResponse:
    """
    Get school-level risk data for the specified district.
    
    Args:
        district: Optional district code to filter by
        
    Returns:
        SchoolRiskResponse containing risk data by school
    """
    logger.info(f"Getting school risk data for district: {district}")
    
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
        
    try:
        if data_store.df is None:
            raise ValueError("No data available")
            
        df = data_store.df.copy()
        
        # Apply district filter if provided
        if district:
            district = str(district).strip()
            df = df[df['DISTRICT_CODE'].astype(str).str.strip() == district]
        
        if df.empty:
            return SchoolRiskResponse(
                schools=[],
                total_students=0,
                average_risk=0.0,
                average_risk_level=SchoolRiskItem.calculate_risk_level(0.0),
                risk_distribution={level: 0 for level in SchoolRiskLevel}
            )
            
        # Determine which prediction column to use (in order of preference)
        prediction_col = None
        for col in ['Predictions', 'Predictions_Grade', 'Predictions_School', 'Predictions_District']:
            if col in df.columns:
                prediction_col = col
                logger.info(f"Using prediction column: {prediction_col}")
                break
                
        if prediction_col is None:
            logger.warning("No prediction columns found, using actual attendance data")
            df['RISK_PERCENTAGE'] = (100 - (df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100).clip(0, 100)).round(2)
        else:
            # Convert prediction to risk percentage (assuming predictions are 0-1 probabilities)
            df['RISK_PERCENTAGE'] = (100 - (df[prediction_col] * 100).clip(0, 100)).round(2)
        
        # Group by school and calculate statistics
        school_groups = df.groupby(['LOCATION_ID', 'SCHOOL_NAME']).agg({
            'RISK_PERCENTAGE': 'mean',
            'STUDENT_ID': 'nunique'
        }).reset_index()
        
        # Calculate overall statistics
        total_students = school_groups['STUDENT_ID'].sum()
        weighted_avg_risk = (school_groups['RISK_PERCENTAGE'] * school_groups['STUDENT_ID']).sum() / total_students if total_students > 0 else 0
        
        # Format the response with risk levels
        school_items = []
        risk_distribution = {level: 0 for level in SchoolRiskLevel}
        
        for _, row in school_groups.iterrows():
            risk_percent = round(float(row['RISK_PERCENTAGE']), 2)
            risk_level = SchoolRiskItem.calculate_risk_level(risk_percent)
            
            school_items.append(SchoolRiskItem(
                school_id=str(row['LOCATION_ID']),
                school_name=row['SCHOOL_NAME'],
                risk_percentage=risk_percent,
                student_count=int(row['STUDENT_ID']),
                risk_level=risk_level
            ))
            
            # Update risk distribution
            risk_distribution[risk_level] += 1
        
        # Sort schools by risk percentage (highest risk first)
        school_items.sort(key=lambda x: x.risk_percentage, reverse=True)
        
        # Calculate overall average risk level
        avg_risk_rounded = round(weighted_avg_risk, 2)
        avg_risk_level = SchoolRiskItem.calculate_risk_level(avg_risk_rounded)
        
        return SchoolRiskResponse(
            schools=school_items,
            total_students=total_students,
            average_risk=avg_risk_rounded,
            average_risk_level=avg_risk_level,
            risk_distribution=risk_distribution
        )
        
    except Exception as e:
        logger.error(f'Error getting school risk data: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))