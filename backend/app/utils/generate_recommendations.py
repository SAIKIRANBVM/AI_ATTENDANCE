import pandas as pd
from backend.classes.Recommendation import Recommendation



def generate_ai_recommendations(df):
    recommendations = []
    
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    if 'RISK_LEVEL' in df.columns:
        risk_counts = df['RISK_LEVEL'].value_counts()
        critical = int(risk_counts.get('Critical', 0))
        high = int(risk_counts.get('High', 0))
        medium = int(risk_counts.get('Medium', 0))
        low = int(risk_counts.get('Low', 0))
        
        recommendations.extend([
            Recommendation(
                recommendation=f"PRIORITY INTERVENTION: Target {critical} Critical-risk students with intensive case management (estimated 60-80% improvement potential)"
            ),
            Recommendation(
                recommendation=f"EARLY SUPPORT: Implement small-group interventions for {high} High-risk students with regular progress monitoring (45-65% success rate)"
            ),
            Recommendation(
                recommendation=f"PREVENTATIVE ACTION: Deploy targeted communications to {medium} Medium-risk students (30-50% prevention rate)"
            ),
            Recommendation(
                recommendation=f"MAINTENANCE: Continue positive reinforcement for {low} Low-risk students to maintain good attendance patterns"
            )
        ])
    
    if 'LAST_ABSENCE_DATE' in df.columns:
        df['DAYS_SINCE_LAST_ABSENCE'] = (pd.to_datetime('today') - pd.to_datetime(df['LAST_ABSENCE_DATE'])).dt.days
        recent_absentees = df[df['DAYS_SINCE_LAST_ABSENCE'] < 14]
        if len(recent_absentees) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"TIMELY OUTREACH: Contact {len(recent_absentees)} students absent in the last 2 weeks (critical window for re-engagement)"
                )
            )
    
    if 'Predictions' in df.columns and 'Prediction_Probability' in df.columns:
        high_confidence = df[(df['Predictions'] == 1) & (df['Prediction_Probability'] > 0.7)]
        if len(high_confidence) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"PREDICTIVE ALERT: Proactively engage with {len(high_confidence)} high-probability cases before attendance declines"
                )
            )
        
        early_warning = df[(df['Predicted_Attendance'] >= 85) & (df['Predictions'] == 1)]
        if len(early_warning) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"EARLY INTERVENTION: Implement preventive measures for {len(early_warning)} students with good attendance but high risk of decline"
                )
            )
    
    if 'SCHOOL_NAME' in df.columns and 'DISTRICT_NAME' in df.columns:
        school_risk = df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME'])['RISK_LEVEL'].apply(
            lambda x: (x == 'Critical').mean() * 100
        ).sort_values(ascending=False).head(3)
        
        for (district, school), risk_pct in school_risk.items():
            if risk_pct > 0:
                recommendations.append(
                    Recommendation(
                        recommendation=f"RESOURCE ALLOCATION: Allocate additional support staff to {school} in {district} with {risk_pct:.1f}% critical-risk students"
                    )
                )
    
    if 'UNEXCUSED_ABSENT_RATE' in df.columns:
        high_unexcused = df[df['UNEXCUSED_ABSENT_RATE'] > 15]
        if len(high_unexcused) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"TARGETED SUPPORT: Deploy family engagement specialists to work with {len(high_unexcused)} students with high unexcused absence rates (>15%)"
                )
            )
    
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predicted_Attendance': 'mean',
            'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100
        }).round(1)
        
        for grade, row in grade_analysis.iterrows():
            if row['RISK_LEVEL'] > 0:
                recommendations.append(
                    Recommendation(
                        recommendation=f"GRADE-LEVEL STRATEGY: Implement specialized attendance program for Grade {grade} with {row['RISK_LEVEL']:.1f}% critical risk students"
                    )
                )
    
    recommendations.append(
        Recommendation(
            recommendation="PERFORMANCE METRICS: Establish baseline attendance rates and set 10% improvement targets for each risk tier"
        )
    )
    
    return recommendations