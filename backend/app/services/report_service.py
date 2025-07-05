import pandas as pd
from backend.app.utils.alerts_utils import al_utils

class ReportService:

    @classmethod
    def generate_summary_report(cls, df: pd.DataFrame) -> pd.DataFrame:
        group_cols = ['DISTRICT_NAME', 'STUDENT_GRADE_LEVEL']
        if 'SCHOOL_NAME' in df.columns:
            group_cols.insert(1, 'SCHOOL_NAME')
        
        if 'Predicted_Attendance' not in df.columns:
            df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
        
        if 'RISK_SCORE' not in df.columns:
            df['RISK_SCORE'] = 100 - df['Predicted_Attendance']
        
        summary = df.groupby(group_cols).agg({
            'STUDENT_ID': 'count', 
            'Predicted_Attendance': ['mean', 'min', 'max', 'std'], 
            'RISK_SCORE': ['mean', 'min', 'max']
        }).reset_index()
        
        summary.columns = [' '.join(col).strip() for col in summary.columns.values]
        
        tiers = ['Tier 4', 'Tier 3', 'Tier 2', 'Tier 1']
        for tier in tiers:
            tier_counts = df.groupby(group_cols)['TIER'].apply(lambda x: (x == tier).sum()).reset_index(name=f'{tier} Count')
            summary = pd.merge(summary, tier_counts, on=group_cols)
        
        for tier in tiers:
            summary[f'{tier} %'] = (summary[f'{tier} Count'] / summary['STUDENT_ID count'] * 100).round(2)
        
        summary.rename(columns={
            'STUDENT_ID count': 'Total Students', 
            'Predicted_Attendance mean': 'Avg Attendance %', 
            'Predicted_Attendance min': 'Min Attendance %', 
            'Predicted_Attendance max': 'Max Attendance %', 
            'Predicted_Attendance std': 'Std Dev Attendance', 
            'RISK_SCORE mean': 'Avg Risk Score', 
            'RISK_SCORE min': 'Min Risk Score', 
            'RISK_SCORE max': 'Max Risk Score'
        }, inplace=True)
        
        return summary
    

    @classmethod
    def generate_detailed_report(cls, df: pd.DataFrame) -> pd.DataFrame:
        report_df = df.copy()
        
        if 'Predicted_Attendance' not in df.columns:
            report_df['Predicted_Attendance'] = report_df['Total_Days_Present'] / report_df['Total_Days_Enrolled'] * 100
        
        if 'RISK_SCORE' not in report_df.columns:
            report_df['RISK_SCORE'] = 100 - report_df['Predicted_Attendance']
        
        if 'RISK_LEVEL' not in report_df.columns:
            report_df['RISK_LEVEL'] = report_df['Predicted_Attendance'].apply(al_utils.assign_risk_level)
        
        risk_factors = []
        recommendations = []
        insights = []
        
        for _, row in report_df.iterrows():
            student_risk_factors = []
            student_recommendations = []
            attendance = row['Predicted_Attendance']
            
            if attendance < 80:
                student_risk_factors.append('Chronic absenteeism (Tier 4)')
                student_recommendations.append('Intensive intervention required')
                student_recommendations.append('Family engagement specialist referral')
                student_recommendations.append('Personalized attendance plan')
            elif attendance < 90:
                student_risk_factors.append('At risk of chronic absenteeism (Tier 3)')
                student_recommendations.append('Early intervention required')
                student_recommendations.append('Attendance improvement plan')
            elif attendance < 95:
                student_risk_factors.append('Moderate attendance concerns (Tier 2)')
                student_recommendations.append('Individualized prevention strategies')
                student_recommendations.append('Regular attendance monitoring')
            else:
                student_risk_factors.append('Good attendance (Tier 1)')
                student_recommendations.append('Continue current practices')
            

            risk_factors.append('|'.join(student_risk_factors) if student_risk_factors else 'None')
            recommendations.append('|'.join(student_recommendations) if student_recommendations else 'Continue monitoring')
        

        report_df['Risk Factors'] = risk_factors
        report_df['Recommendations'] = recommendations
        
        columns_to_include = ['STUDENT_ID', 'DISTRICT_NAME', 'STUDENT_GRADE_LEVEL', 'Predicted_Attendance', 'TIER', 'RISK_SCORE', 'RISK_LEVEL', 'Risk Factors', 'Recommendations']
        if 'SCHOOL_NAME' in report_df.columns:
            columns_to_include.insert(2, 'SCHOOL_NAME')
        
        existing_columns = [col for col in columns_to_include if col in report_df.columns]
        report_df = report_df[existing_columns]
        
        column_renames = {
            'STUDENT_ID': 'Student ID', 
            'DISTRICT_NAME': 'District', 
            'SCHOOL_NAME': 'School', 
            'STUDENT_GRADE_LEVEL': 'Grade', 
            'Predicted_Attendance': 'Predicted Attendance %', 
            'RISK_SCORE': 'Risk Score', 
            'RISK_LEVEL': 'Risk Level'
        }
        
        rename_dict = {k: v for k, v in column_renames.items() if k in report_df.columns}
        report_df.rename(columns=rename_dict, inplace=True)
        
        return report_df
