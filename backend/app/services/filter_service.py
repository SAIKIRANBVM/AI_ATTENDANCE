import pandas as pd
import time

from backend.app.utils.logger import logger
from backend.app.config import get_current_year


class FilterService:
    CURRENT_SCHOOL_YEAR = get_current_year()

    @classmethod
    def filter_data(cls, df, district_code=None, school_code=None, grade_code=None):
        try:
            start_time = time.time()
            mask = pd.Series(True, index=df.index)
            logger.info(f'Starting with {len(df)} rows')
            logger.info(f'Available columns: {df.columns.tolist()}')
            
            df = df.copy()
            
            column_mapping = {
                'DISTRICT_CODE': 'DISTRICT_CODE',
                'SCHOOL_CODE': 'LOCATION_ID',
                'GRADE_CODE': 'STUDENT_GRADE_LEVEL',
                'DISTRICT_NAME': 'DISTRICT_NAME',
                'SCHOOL_NAME': 'SCHOOL_NAME',
                'GRADE_LEVEL': 'STUDENT_GRADE_LEVEL',
                'STUDENT_ID': 'STUDENT_ID'
            }
            
            actual_columns = {}
            for std_name, actual_name in column_mapping.items():
                if actual_name in df.columns:
                    actual_columns[std_name] = actual_name
            
            logger.info(f'Found columns: {actual_columns}')
            
            for col in ['DISTRICT_CODE', 'SCHOOL_CODE', 'GRADE_CODE', 'STUDENT_ID']:
                if col in actual_columns and col in df.columns:
                    df[col] = df[col].astype(str).str.strip()
            
            if district_code and district_code.strip():
                district_code = str(district_code).strip()
                if 'DISTRICT_CODE' in actual_columns:
                    if district_code.upper().startswith('D'):
                        numeric_part = ''.join(filter(str.isdigit, district_code))
                        logger.info(f'Extracted numeric part from district code: {district_code} -> {numeric_part}')
                        mask &= df[actual_columns['DISTRICT_CODE']].astype(str).str.strip() == numeric_part
                    else:
                        mask &= df[actual_columns['DISTRICT_CODE']].astype(str).str.strip() == district_code
                    
                    logger.info(f'After district code filter: {mask.sum()} rows remaining. ' \
                                f'Looking for: {district_code} (numeric part: {numeric_part if "numeric_part" in locals() else "N/A"}), ' \
                                f'Available: {df[actual_columns["DISTRICT_CODE"]].astype(str).str.strip().unique()[:10].tolist()}{"..." if len(df[actual_columns["DISTRICT_CODE"]].astype(str).str.strip().unique()) > 10 else ""}')
                elif 'DISTRICT_NAME' in actual_columns:
                    mask &= df[actual_columns['DISTRICT_NAME']].astype(str).str.strip().str.upper() == district_code.upper()
                    logger.info(f'After district name filter: {mask.sum()} rows remaining')
            
            if school_code and school_code.strip() and mask.any():
                school_code = str(school_code).strip()
                if 'SCHOOL_CODE' in actual_columns:
                    mask &= df[actual_columns['SCHOOL_CODE']].astype(str).str.strip() == school_code
                    logger.info(f'After school code filter: {mask.sum()} rows remaining. ' \
                            f'Looking for: {school_code}, ' \
                            f'Available: {df[actual_columns["SCHOOL_CODE"]].astype(str).str.strip().unique()[:10].tolist()}{"..." if len(df[actual_columns["SCHOOL_CODE"]].astype(str).str.strip().unique()) > 10 else ""}')
                elif 'SCHOOL_NAME' in actual_columns:
                    mask &= df[actual_columns['SCHOOL_NAME']].astype(str).str.strip().str.upper() == school_code.upper()
                    logger.info(f'After school name filter: {mask.sum()} rows remaining')
            
            if grade_code and grade_code.strip() and mask.any():
                grade_code = str(grade_code).strip()
                logger.info(f'Applying grade filter for grade: {grade_code}')
                
                if 'GRADE_CODE' in actual_columns:
                    all_grades = df[actual_columns['GRADE_CODE']].astype(str).str.strip()
                    logger.info(f'All grade values in dataset (first 50): {sorted(all_grades.unique().tolist())[:50]}')
                
                try:
                    normalized_grade = grade_code.upper()
                    if normalized_grade in ['PK', 'PRE-K', 'PRE-KINDERGARTEN', '-1']:
                        normalized_grade = '-1'
                    elif normalized_grade in ['K', 'KINDERGARTEN', '0']:
                        normalized_grade = '0'
                    else:
                        normalized_grade = ''.join(filter(str.isdigit, grade_code))
                        normalized_grade = normalized_grade if normalized_grade else grade_code
                    
                    logger.info(f'Normalized grade code: {grade_code} -> {normalized_grade}')
                    
                    if 'GRADE_CODE' in actual_columns:
                        def normalize_grade(g):
                            if pd.isna(g):
                                return None
                            g = str(g).strip().upper()
                            if g in ['PK', 'PRE-K', 'PRE-KINDERGARTEN', '-1']:
                                return '-1'
                            if g in ['K', 'KINDERGARTEN', '0']:
                                return '0'
                            nums = ''.join(filter(str.isdigit, g))
                            return nums if nums else g
                        
                        normalized_grades = df[actual_columns['GRADE_CODE']].apply(normalize_grade)
                        
                        mask &= normalized_grades == normalized_grade
                        
                        logger.info(f'After grade code filter: {mask.sum()} rows remaining.')
                        logger.info(f'Looking for grade: {normalized_grade} (original: {grade_code})')
                        
                        grade_counts = normalized_grades.value_counts().to_dict()
                        logger.info(f'Grade distribution in filtered data: {dict(sorted(grade_counts.items())[:20])}...')
                        
                except Exception as e:
                    logger.error(f'Error processing grade filter: {str(e)}')
            else:
                logger.info('No grade filter applied')
            
            if 'SCHOOL_YEAR' in df.columns and mask.any():
                mask &= (df['SCHOOL_YEAR'].astype(str).str.strip() == str(cls.CURRENT_SCHOOL_YEAR))
                logger.info(f'After school year filter ({cls.CURRENT_SCHOOL_YEAR}): {mask.sum()} rows remain')
                
                if mask.sum() == 0 and len(df) > 0:
                    unique_years = df['SCHOOL_YEAR'].astype(str).unique()
                    logger.warning(f'No data found for current school year {cls.CURRENT_SCHOOL_YEAR}. Available years: {unique_years}')
            
            filtered_df = df[mask].copy()
            logger.info(f'Filtering completed in {time.time() - start_time:.4f} seconds, returning {len(filtered_df)} rows')
            
            if len(filtered_df) > 0:
                logger.info(f'Sample filtered data (first row): {filtered_df.iloc[0].to_dict() if not filtered_df.empty else "No data"}')
                
                for col in ['DISTRICT_NAME', 'DISTRICT_CODE', 'SCHOOL_NAME', 'SCHOOL_CODE', 'GRADE_LEVEL', 'GRADE_CODE']:
                    if col in filtered_df.columns:
                        unique_vals = filtered_df[col].dropna().unique()
                        logger.info(f'Unique {col} values: {unique_vals[:10]}{"..." if len(unique_vals) > 10 else ""}')
            else:
                logger.warning('No data matches the filters. Available values in original data:')
                for col in ['DISTRICT_CODE', 'SCHOOL_CODE', 'GRADE_CODE']:
                    if col in df.columns:
                        unique_vals = df[col].dropna().unique()
                        logger.warning(f'Available {col} values: {unique_vals[:10]}{"..." if len(unique_vals) > 10 else ""}')
            
            return filtered_df
            
        except Exception as e:
            error_msg = f"Error in filter_data: {str(e)}"
            logger.error(error_msg)
            return pd.DataFrame(columns=df.columns)