import pandas as pd
import numpy as np
from backend.classes.Recommendation import Recommendation

def generate_ai_recommendations(df, shap_values=None, feature_names=None):
    recommendations = []
    
    if 'Attendance_Rate' not in df.columns:
        df['Attendance_Rate'] = (df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100).round(2)
    
  
    if 'DISTRICT_NAME' in df.columns and 'Predictions_District' in df.columns:
        district_analysis = df.groupby('DISTRICT_NAME').agg({
            'Predictions_District': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
      
        district_analysis['performance_gap'] = district_analysis['Predictions_District'] - district_analysis['Attendance_Rate']
        
     
        underperforming_districts = district_analysis[district_analysis['performance_gap'] > 5].nlargest(3, 'performance_gap')
        
        for district, metrics in underperforming_districts.iterrows():
            recommendations.append(
                Recommendation(
                    recommendation=f"🎯 AI ALERT: {district} district shows {metrics['performance_gap']:.1f}% prediction gap - implement district-wide attendance coaching program for {metrics['student_count']} students"
                )
            )
    
    if 'SCHOOL_NAME' in df.columns and 'Predictions_School' in df.columns:
        school_analysis = df.groupby('SCHOOL_NAME').agg({
            'Predictions_School': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'sum',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
      
        school_analysis['risk_score'] = (
            (100 - school_analysis['Attendance_Rate']) * 0.4 +
            (school_analysis['Total_Days_Unexcused_Absent'] / school_analysis['student_count']) * 0.3 +
            abs(school_analysis['Predictions_School'] - school_analysis['Attendance_Rate']) * 0.3
        )
        
        high_risk_schools = school_analysis.nlargest(4, 'risk_score')
        
        for school, metrics in high_risk_schools.iterrows():
            intervention_type = "intensive case management" if metrics['risk_score'] > 15 else "targeted mentoring"
            recommendations.append(
                Recommendation(
                    recommendation=f"🏫 AI SCHOOL PRIORITY: {school} flagged with {metrics['risk_score']:.1f} risk score - deploy {intervention_type} for {metrics['student_count']} students"
                )
            )
    
    
    if 'STUDENT_GRADE_LEVEL' in df.columns and 'Predictions_Grade' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predictions_Grade': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
     
        grade_analysis['prediction_accuracy'] = abs(grade_analysis['Predictions_Grade'] - grade_analysis['Attendance_Rate'])
        
        volatile_grades = grade_analysis[grade_analysis['prediction_accuracy'] > 3].nlargest(3, 'prediction_accuracy')
        
        for grade, metrics in volatile_grades.iterrows():
            recommendations.append(
                Recommendation(
                    recommendation=f"📚 AI GRADE INSIGHT: Grade {grade} shows {metrics['prediction_accuracy']:.1f}% prediction volatility - implement adaptive intervention strategies for {metrics['student_count']} students"
                )
            )
    
    
    if 'STUDENT_GENDER' in df.columns:
        gender_analysis = df.groupby('STUDENT_GENDER').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        gender_gap = gender_analysis['Attendance_Rate'].max() - gender_analysis['Attendance_Rate'].min()
        if gender_gap > 3:
            lower_performing_gender = gender_analysis['Attendance_Rate'].idxmin()
            recommendations.append(
                Recommendation(
                    recommendation=f"🎭 AI DEMOGRAPHIC INSIGHT: {gender_gap:.1f}% attendance gap detected - implement gender-specific engagement programs for {lower_performing_gender} students"
                )
            )
    

    if 'ECONOMIC_CODE' in df.columns:
        economic_analysis = df.groupby('ECONOMIC_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
   
        if len(economic_analysis) > 1:
            economic_gap = economic_analysis['Attendance_Rate'].max() - economic_analysis['Attendance_Rate'].min()
            if economic_gap > 5:
                at_risk_economic_group = economic_analysis['Attendance_Rate'].idxmin()
                recommendations.append(
                    Recommendation(
                        recommendation=f"💰 AI ECONOMIC INSIGHT: {economic_gap:.1f}% attendance gap by economic status - prioritize family support services for {at_risk_economic_group} code students"
                    )
                )
    

    if 'SPECIAL_ED_CODE' in df.columns:
        special_ed_analysis = df.groupby('SPECIAL_ED_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
    
        if len(special_ed_analysis) > 1:
            special_ed_gap = special_ed_analysis['Attendance_Rate'].max() - special_ed_analysis['Attendance_Rate'].min()
            if special_ed_gap > 4:
                recommendations.append(
                    Recommendation(
                        recommendation=f"♿ AI SPECIAL ED INSIGHT: {special_ed_gap:.1f}% attendance gap in special education - enhance IEP attendance goals and family collaboration"
                    )
                )
    
   
    if 'ENG_PROF_CODE' in df.columns:
        eng_prof_analysis = df.groupby('ENG_PROF_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        if len(eng_prof_analysis) > 1:
            eng_prof_gap = eng_prof_analysis['Attendance_Rate'].max() - eng_prof_analysis['Attendance_Rate'].min()
            if eng_prof_gap > 3:
                recommendations.append(
                    Recommendation(
                        recommendation=f"🗣️ AI LANGUAGE INSIGHT: {eng_prof_gap:.1f}% attendance gap by English proficiency - implement multilingual family engagement programs"
                    )
                )
    
    if 'ETHNIC_CODE' in df.columns:
        ethnic_analysis = df.groupby('ETHNIC_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
       
        if len(ethnic_analysis) > 1:
            ethnic_gap = ethnic_analysis['Attendance_Rate'].max() - ethnic_analysis['Attendance_Rate'].min()
            if ethnic_gap > 4:
                lowest_group = ethnic_analysis['Attendance_Rate'].idxmin()
                recommendations.append(
                    Recommendation(
                        recommendation=f"🌍 AI EQUITY INSIGHT: {ethnic_gap:.1f}% attendance gap by ethnicity - develop culturally responsive interventions for ethnic code {lowest_group}"
                    )
                )
    
   
    if 'HISPANIC_IND' in df.columns:
        hispanic_analysis = df.groupby('HISPANIC_IND').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
      
        if len(hispanic_analysis) > 1:
            hispanic_gap = hispanic_analysis['Attendance_Rate'].max() - hispanic_analysis['Attendance_Rate'].min()
            if hispanic_gap > 3:
                recommendations.append(
                    Recommendation(
                        recommendation=f"🏛️ AI HISPANIC INSIGHT: {hispanic_gap:.1f}% attendance gap - implement Latino family engagement specialists and bilingual communication strategies"
                    )
                )
    
 
    if 'Total_Days_Unexcused_Absent' in df.columns:
        df['unexcused_category'] = pd.cut(df['Total_Days_Unexcused_Absent'], 
                                         bins=[0, 2, 5, 10, float('inf')], 
                                         labels=['Low', 'Medium', 'High', 'Critical'])
        
        unexcused_analysis = df.groupby('unexcused_category', observed=True).agg({
            'Attendance_Rate': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        for category, metrics in unexcused_analysis.iterrows():
            if category in ['High', 'Critical'] and metrics['student_count'] > 0:
                intervention_intensity = "daily check-ins" if category == 'Critical' else "weekly monitoring"
                recommendations.append(
                    Recommendation(
                        recommendation=f"⚠️ AI UNEXCUSED PATTERN: {metrics['student_count']} students in {category} unexcused category - implement {intervention_intensity} with {metrics['Attendance_Rate']:.1f}% current rate"
                    )
                )
    
   
    if 'SCHOOL_YEAR' in df.columns and df['SCHOOL_YEAR'].nunique() > 1:
        yearly_trends = df.groupby('SCHOOL_YEAR').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
       
        if len(yearly_trends) > 1:
            years = sorted(yearly_trends.index)
            latest_year = years[-1]
            previous_year = years[-2]
            
            trend_change = yearly_trends.loc[latest_year, 'Attendance_Rate'] - yearly_trends.loc[previous_year, 'Attendance_Rate']
            
            if trend_change < -2:
                recommendations.append(
                    Recommendation(
                        recommendation=f"📈 AI TREND ALERT: {abs(trend_change):.1f}% attendance decline from {previous_year} to {latest_year} - implement system-wide retention strategies immediately"
                    )
                )
            elif trend_change > 2:
                recommendations.append(
                    Recommendation(
                        recommendation=f"🎉 AI TREND POSITIVE: {trend_change:.1f}% attendance improvement from {previous_year} to {latest_year} - scale successful interventions district-wide"
                    )
                )
   
    if 'Predictions' in df.columns and 'Attendance_Rate' in df.columns:
        df['prediction_error'] = abs(df['Predictions'] - df['Attendance_Rate'])
        
        high_error_students = df[df['prediction_error'] > 10]
        
        if len(high_error_students) > 0:
            avg_error = high_error_students['prediction_error'].mean()
            recommendations.append(
                Recommendation(
                    recommendation=f"🤖 AI PREDICTION INSIGHT: {len(high_error_students)} students show {avg_error:.1f}% prediction variance - investigate underlying pattern changes and adjust models"
                )
            )
    
 
    if all(col in df.columns for col in ['Predictions', 'Predictions_District', 'Predictions_School', 'Predictions_Grade']):
       
        df['prediction_consistency'] = df[['Predictions', 'Predictions_District', 'Predictions_School', 'Predictions_Grade']].std(axis=1)
        
        inconsistent_students = df[df['prediction_consistency'] > 5]
        
        if len(inconsistent_students) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"🔍 AI CONSISTENCY ALERT: {len(inconsistent_students)} students show inconsistent predictions across levels - requires individualized assessment and intervention planning"
                )
            )
    
    
    if 'Total_Days_Enrolled' in df.columns and 'Total_Days_Present' in df.columns:
        
        df['enrollment_efficiency'] = df['Total_Days_Present'] / df['Total_Days_Enrolled']
        
       
        low_efficiency = df[df['enrollment_efficiency'] < 0.85]
        
        if len(low_efficiency) > 0:
            avg_efficiency = low_efficiency['enrollment_efficiency'].mean()
            recommendations.append(
                Recommendation(
                    recommendation=f"📊 AI EFFICIENCY INSIGHT: {len(low_efficiency)} students show {avg_efficiency:.1%} enrollment efficiency - optimize scheduling and reduce barriers to attendance"
                )
            )
    
   
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Attendance_Rate' in df.columns:
        
        df['ai_risk_score'] = (
            (100 - df['Attendance_Rate']) * 0.4 +
            (df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100) * 0.4 +
            df.get('prediction_error', 0) * 0.2
        )
        
        
        risk_segments = pd.cut(df['ai_risk_score'], 
                              bins=[0, 10, 20, 35, float('inf')], 
                              labels=['Monitor', 'Support', 'Intervene', 'Urgent'])
        
        for segment in ['Support', 'Intervene', 'Urgent']:
            segment_count = (risk_segments == segment).sum()
            if segment_count > 0:
                avg_risk = df[risk_segments == segment]['ai_risk_score'].mean()
                intervention_map = {
                    'Support': 'weekly check-ins',
                    'Intervene': 'intensive counseling',
                    'Urgent': 'immediate case management'
                }
                
    
    return recommendations[:15]  