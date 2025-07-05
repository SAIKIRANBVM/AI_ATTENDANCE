from backend.classes.KeyInsight import KeyInsight

def generate_ai_insights(df):
    insights = []
    total_students = len(df)
    
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    tier4_pct = (df['TIER'] == 'Tier 4').sum() / total_students * 100 if total_students > 0 else 0
    tier3_pct = (df['TIER'] == 'Tier 3').sum() / total_students * 100 if total_students > 0 else 0
    tier2_pct = (df['TIER'] == 'Tier 2').sum() / total_students * 100 if total_students > 0 else 0
    tier1_pct = (df['TIER'] == 'Tier 1').sum() / total_students * 100 if total_students > 0 else 0
    
    tier_insights = [
        KeyInsight(insight=f"Tier 4 Students: {(df['TIER'] == 'Tier 4').sum()} students ({tier4_pct:.1f}%) have attendance below 80% - needs intensive intervention"),
        KeyInsight(insight=f"Tier 3 Students: {(df['TIER'] == 'Tier 3').sum()} students ({tier3_pct:.1f}%) have attendance between 80-90% - early intervention required"),
        KeyInsight(insight=f"Tier 2 Students: {(df['TIER'] == 'Tier 2').sum()} students ({tier2_pct:.1f}%) have attendance between 90-95% - needs individualized prevention"),
        KeyInsight(insight=f"Tier 1 Students: {(df['TIER'] == 'Tier 1').sum()} students ({tier1_pct:.1f}%) have attendance above 95% - no intervention needed")
    ]
    
    if 'Predictions' in df.columns:
        predicted_decliners = df[df['Predictions'] == 1]
        if len(predicted_decliners) > 0:
            insights.append(KeyInsight(
                insight=f'AI MODEL PREDICTION: {len(predicted_decliners)} students ({len(predicted_decliners) / total_students * 100:.1f}%) are predicted to have problematic attendance in the future'
            ))
            
            early_warning = df[(df['Predicted_Attendance'] >= 85) & (df['Predictions'] == 1)]
            if len(early_warning) > 0:
                insights.append(KeyInsight(
                    insight=f'AI EARLY WARNING: {len(early_warning)} students ({len(early_warning) / total_students * 100:.1f}%) currently have good attendance but are predicted to decline'
                ))
    
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
        df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
        high_unexcused = df[df['UNEXCUSED_ABSENT_RATE'] > 10]
        if len(high_unexcused) > 0:
            insights.append(KeyInsight(
                insight=f'HIGH UNEXCUSED ABSENCES: {len(high_unexcused)} students ({len(high_unexcused) / total_students * 100:.1f}%) have unexcused absence rates above 10%'
            ))
    
    chronic_threshold = 80
    chronic_students = df[df['Predicted_Attendance'] < chronic_threshold]
    if len(chronic_students) > 0:
        chronic_pct = len(chronic_students) / total_students * 100
        insights.append(KeyInsight(
            insight=f'CHRONIC ABSENCE ALERT: {len(chronic_students)} students ({chronic_pct:.1f}%) are chronically absent with attendance below {chronic_threshold}%'
        ))
    
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL')['Predicted_Attendance'].agg(['mean', 'count'])
        if not grade_analysis.empty:
            grade_analysis['mean_percent'] = grade_analysis['mean'] * 100
           
            if len(grade_analysis) > 1:
                lowest_grade = grade_analysis['mean_percent'].idxmin()
                lowest_attendance = grade_analysis['mean_percent'].min()
                highest_grade = grade_analysis['mean_percent'].idxmax()
                highest_attendance = grade_analysis['mean_percent'].max()
               
                insights.extend([
                    KeyInsight(insight=f'GRADE LEVEL: Grade {lowest_grade} has the lowest average attendance at {lowest_attendance:.1f}%'),
                    KeyInsight(insight=f'BEST PERFORMING: Grade {highest_grade} has the highest average attendance at {highest_attendance:.1f}%')
                ])
            else:
                grade = grade_analysis.index[0]
                attendance = grade_analysis['mean_percent'].iloc[0]
                insights.append(KeyInsight(
                    insight=f'AVERAGE ATTENDANCE: Grade {grade} has an average attendance of {attendance:.1f}%'
                ))
           
            grade_analysis = grade_analysis.sort_index()
            grade_analysis['change'] = grade_analysis['mean'].diff()
            significant_drop = grade_analysis[grade_analysis['change'] < -5]
           
            for grade, row in significant_drop.iterrows():
                prev_grade = grade - 1 if isinstance(grade, (int, float)) else None
                if prev_grade in grade_analysis.index:
                    insights.append(KeyInsight(
                        insight=f'ATTENDANCE DROP: Grade {grade} shows a {abs(row["change"]):.1f}% drop in attendance compared to Grade {prev_grade}'
                    ))
    
    if 'Previous_Attendance' in df.columns:
        df['Attendance_Change'] = df['Predicted_Attendance'] - df['Previous_Attendance']
        improving = df[df['Attendance_Change'] > 5]
        declining = df[df['Attendance_Change'] < -5]
        
        if len(improving) > 0:
            insights.append(KeyInsight(
                insight=f'POSITIVE TREND: {len(improving)} students ({len(improving)/total_students*100:.1f}%) have shown significant attendance improvement (>5%)'
            ))
        if len(declining) > 0:
            insights.append(KeyInsight(
                insight=f'DECLINING TREND: {len(declining)} students ({len(declining)/total_students*100:.1f}%) have shown significant attendance decline (>5%)'
            ))
    
    day_columns = [col for col in df.columns if any(day in col.lower() for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])]
    if day_columns:
        day_means = df[day_columns].mean()
        worst_day = day_means.idxmin()
        best_day = day_means.idxmax()
        insights.append(KeyInsight(
            insight=f'DAY PATTERN: Lowest attendance typically on {worst_day.replace("_", " ").title()}, highest on {best_day.replace("_", " ").title()}'
        ))
    
    if 'RISK_SCORE' in df.columns and 'Total_Days_Enrolled' in df.columns:
        high_impact = df[(df['RISK_SCORE'].between(40, 70)) & (df['Total_Days_Enrolled'] > 50)]
        if len(high_impact) > 0:
            insights.append(KeyInsight(
                insight=f'HIGH-IMPACT OPPORTUNITY: {len(high_impact)} students in the moderate risk range could benefit most from early intervention'
            ))
    
    return tier_insights + insights