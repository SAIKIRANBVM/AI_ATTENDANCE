import pandas as pd
import numpy as np
from backend.classes.KeyInsight import KeyInsight

def generate_ai_insights(df, shap_values=None, feature_names=None):
    insights = []
    total_students = len(df)
    
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    # SHAP-based feature importance insights
    if shap_values is not None and feature_names is not None:
        # Global feature importance analysis
        shap_importance = np.abs(shap_values).mean(axis=0)
        top_features = np.argsort(shap_importance)[-3:][::-1]  # Top 3 most important features
        
        insights.append(KeyInsight(
            insight=f"SHAP FEATURE ANALYSIS: Top attendance predictors are {', '.join([feature_names[i] for i in top_features])} with importance scores {', '.join([f'{shap_importance[i]:.3f}' for i in top_features])}"
        ))
        
        # Positive vs negative SHAP contributions
        positive_impact = (shap_values > 0).sum(axis=0)
        negative_impact = (shap_values < 0).sum(axis=0)
        
        most_positive_feature = feature_names[np.argmax(positive_impact)]
        most_negative_feature = feature_names[np.argmax(negative_impact)]
        
        insights.append(KeyInsight(
            insight=f"SHAP IMPACT PATTERNS: {most_positive_feature} most frequently improves attendance predictions ({positive_impact.max()} students), while {most_negative_feature} most often indicates risk ({negative_impact.max()} students)"
        ))
    
    # Enhanced tier analysis with SHAP insights
    if 'TIER' in df.columns:
        tier_counts = df['TIER'].value_counts()
        tier_attendance = df.groupby('TIER')['Predicted_Attendance'].mean()
        
        # Add SHAP-based tier risk assessment
        if shap_values is not None:
            tier_shap_scores = {}
            for tier in ['Tier 4', 'Tier 3', 'Tier 2', 'Tier 1']:
                if tier in df['TIER'].values:
                    tier_mask = df['TIER'] == tier
                    tier_indices = df[tier_mask].index
                    if len(tier_indices) > 0:
                        avg_shap_impact = np.abs(shap_values[tier_indices]).mean()
                        tier_shap_scores[tier] = avg_shap_impact
        
        for tier in ['Tier 4', 'Tier 3', 'Tier 2', 'Tier 1']:
            if tier in tier_counts.index:
                count = tier_counts[tier]
                pct = count / total_students * 100
                avg_attendance = tier_attendance.get(tier, 0)
                
                # Add SHAP context
                shap_context = ""
                if shap_values is not None and tier in tier_shap_scores:
                    shap_risk = tier_shap_scores[tier]
                    shap_context = f" (SHAP risk score: {shap_risk:.3f})"
                
                if tier == 'Tier 4':
                    severity = "CRITICAL CONCERN" if pct > 15 else "ATTENTION NEEDED"
                    insights.append(KeyInsight(
                        insight=f"{severity}: {count} students ({pct:.1f}%) in {tier} with {avg_attendance:.1f}% avg attendance{shap_context} - intensive intervention required"
                    ))
                elif tier == 'Tier 3':
                    trend = "rising concern" if pct > 20 else "manageable group"
                    insights.append(KeyInsight(
                        insight=f"EARLY INTERVENTION TARGET: {count} students ({pct:.1f}%) in {tier} represent {trend} with {avg_attendance:.1f}% attendance{shap_context}"
                    ))
                elif tier == 'Tier 2':
                    opportunity = "high prevention potential" if pct > 25 else "stable monitoring group"
                    insights.append(KeyInsight(
                        insight=f"PREVENTION OPPORTUNITY: {count} students ({pct:.1f}%) in {tier} show {opportunity} with {avg_attendance:.1f}% attendance{shap_context}"
                    ))
                else:  # Tier 1
                    status = "strong foundation" if pct > 40 else "solid performance"
                    insights.append(KeyInsight(
                        insight=f"POSITIVE BASELINE: {count} students ({pct:.1f}%) in {tier} maintain {status} with {avg_attendance:.1f}% attendance{shap_context}"
                    ))
    
    # SHAP-enhanced prediction insights
    if 'Predictions' in df.columns and 'Prediction_Probability' in df.columns:
        predicted_decliners = df[df['Predictions'] == 1]
        
        if len(predicted_decliners) > 0:
            avg_confidence = predicted_decliners['Prediction_Probability'].mean()
            high_confidence_count = (predicted_decliners['Prediction_Probability'] > 0.7).sum()
            
            # Add SHAP-based prediction explanation
            shap_explanation = ""
            if shap_values is not None:
                decliner_indices = predicted_decliners.index
                decliner_shap = shap_values[decliner_indices]
                avg_shap_impact = np.abs(decliner_shap).mean()
                shap_explanation = f" with {avg_shap_impact:.3f} avg SHAP impact"
            
            prediction_strength = "HIGH CONFIDENCE" if avg_confidence > 0.7 else "MODERATE CONFIDENCE"
            insights.append(KeyInsight(
                insight=f'AI PREDICTION ({prediction_strength}): {len(predicted_decliners)} students ({len(predicted_decliners) / total_students * 100:.1f}%) predicted for attendance decline{shap_explanation} - {high_confidence_count} high-confidence cases'
            ))
            
            # SHAP-based early warning with feature explanations
            current_good_performance = df['Predicted_Attendance'].quantile(0.6)
            early_warning = df[(df['Predicted_Attendance'] >= current_good_performance) & (df['Predictions'] == 1)]
            
            if len(early_warning) > 0:
                avg_current_attendance = early_warning['Predicted_Attendance'].mean()
                
                # Identify key SHAP features for early warning cases
                shap_feature_insight = ""
                if shap_values is not None and feature_names is not None:
                    warning_indices = early_warning.index
                    warning_shap = shap_values[warning_indices]
                    feature_impacts = np.abs(warning_shap).mean(axis=0)
                    top_warning_feature = feature_names[np.argmax(feature_impacts)]
                    shap_feature_insight = f" - key risk factor: {top_warning_feature}"
                
                insights.append(KeyInsight(
                    insight=f'SHAP EARLY WARNING: {len(early_warning)} students ({len(early_warning) / total_students * 100:.1f}%) with {avg_current_attendance:.1f}% attendance predicted to decline{shap_feature_insight}'
                ))
    
    # Enhanced unexcused absence analysis with SHAP
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
        df['UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
        
        severe_threshold = max(15, df['UNEXCUSED_ABSENT_RATE'].quantile(0.9))
        moderate_threshold = max(5, df['UNEXCUSED_ABSENT_RATE'].quantile(0.7))
        
        severe_cases = df[df['UNEXCUSED_ABSENT_RATE'] > severe_threshold]
        moderate_cases = df[df['UNEXCUSED_ABSENT_RATE'].between(moderate_threshold, severe_threshold)]
        
        if len(severe_cases) > 0:
            avg_severe_rate = severe_cases['UNEXCUSED_ABSENT_RATE'].mean()
            
            # Add SHAP context for severe cases
            shap_context = ""
            if shap_values is not None:
                severe_indices = severe_cases.index
                severe_shap = np.abs(shap_values[severe_indices]).mean()
                shap_context = f" (SHAP risk: {severe_shap:.3f})"
            
            insights.append(KeyInsight(
                insight=f'SEVERE UNEXCUSED PATTERNS: {len(severe_cases)} students ({len(severe_cases) / total_students * 100:.1f}%) with {avg_severe_rate:.1f}% avg unexcused rate{shap_context} - immediate family engagement needed'
            ))
    
    # SHAP-enhanced chronic absence analysis
    attendance_distribution = df['Predicted_Attendance'].describe()
    chronic_threshold = min(80, attendance_distribution['25%'])
    
    chronic_students = df[df['Predicted_Attendance'] < chronic_threshold]
    if len(chronic_students) > 0:
        chronic_pct = len(chronic_students) / total_students * 100
        avg_chronic_attendance = chronic_students['Predicted_Attendance'].mean()
        
        # SHAP-based chronic absence risk factors
        shap_risk_factors = ""
        if shap_values is not None and feature_names is not None:
            chronic_indices = chronic_students.index
            chronic_shap = shap_values[chronic_indices]
            feature_impacts = np.abs(chronic_shap).mean(axis=0)
            top_chronic_features = np.argsort(feature_impacts)[-2:][::-1]  # Top 2 features
            shap_risk_factors = f" - key factors: {', '.join([feature_names[i] for i in top_chronic_features])}"
        
        severity_level = "CRISIS" if chronic_pct > 20 else "ALERT" if chronic_pct > 10 else "CONCERN"
        insights.append(KeyInsight(
            insight=f'CHRONIC ABSENCE {severity_level}: {len(chronic_students)} students ({chronic_pct:.1f}%) with {avg_chronic_attendance:.1f}% avg attendance{shap_risk_factors}'
        ))
    
    # SHAP-enhanced grade-level analysis
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predicted_Attendance': ['mean', 'std', 'count'],
            'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100 if 'RISK_LEVEL' in df.columns else 0
        }).round(2)
        
        grade_analysis.columns = ['avg_attendance', 'attendance_std', 'student_count', 'critical_risk_pct']
        
        # Add SHAP-based grade risk assessment
        if shap_values is not None:
            grade_shap_scores = {}
            for grade, group in df.groupby('STUDENT_GRADE_LEVEL'):
                if len(group) > 0:
                    grade_indices = group.index
                    avg_shap_impact = np.abs(shap_values[grade_indices]).mean()
                    grade_shap_scores[grade] = avg_shap_impact
            
            for grade in grade_analysis.index:
                grade_analysis.loc[grade, 'shap_risk'] = grade_shap_scores.get(grade, 0)
        
        if len(grade_analysis) > 1:
            best_grade = grade_analysis['avg_attendance'].idxmax()
            worst_grade = grade_analysis['avg_attendance'].idxmin()
            
            best_performance = grade_analysis.loc[best_grade, 'avg_attendance']
            worst_performance = grade_analysis.loc[worst_grade, 'avg_attendance']
            
            performance_gap = best_performance - worst_performance
            
            # Add SHAP context for grade performance
            shap_context = ""
            if shap_values is not None:
                best_shap = grade_analysis.loc[best_grade, 'shap_risk'] if 'shap_risk' in grade_analysis.columns else 0
                worst_shap = grade_analysis.loc[worst_grade, 'shap_risk'] if 'shap_risk' in grade_analysis.columns else 0
                shap_context = f" (SHAP risk - Best: {best_shap:.3f}, Worst: {worst_shap:.3f})"
            
            insights.append(KeyInsight(
                insight=f'GRADE PERFORMANCE GAP: {performance_gap:.1f}% difference between Grade {best_grade} ({best_performance:.1f}%) and Grade {worst_grade} ({worst_performance:.1f}%){shap_context}'
            ))
    
    # SHAP-based high-impact opportunity identification
    if shap_values is not None and 'RISK_SCORE' in df.columns:
        # Find students with moderate SHAP values (highest intervention potential)
        total_shap_impact = np.abs(shap_values).sum(axis=1)
        shap_median = np.median(total_shap_impact)
        
        high_impact_candidates = df[
            (total_shap_impact > shap_median * 0.7) & 
            (total_shap_impact < shap_median * 1.3)
        ]
        
        if len(high_impact_candidates) > 0:
            avg_shap_impact = total_shap_impact[high_impact_candidates.index].mean()
            
            # Find most influential features for these candidates
            candidate_indices = high_impact_candidates.index
            candidate_shap = shap_values[candidate_indices]
            feature_impacts = np.abs(candidate_shap).mean(axis=0)
            top_feature = feature_names[np.argmax(feature_impacts)] # type:ignore
            
            insights.append(KeyInsight(
                insight=f'SHAP HIGH-IMPACT OPPORTUNITY: {len(high_impact_candidates)} students with optimal intervention potential (avg SHAP: {avg_shap_impact:.3f}) - focus on {top_feature}'
            ))
    
    # SHAP-based prediction accuracy insights
    if shap_values is not None and 'Predictions' in df.columns:
        # Analyze SHAP value distributions for correct vs incorrect predictions
        predicted_at_risk = df['Predictions'] == 1
        if predicted_at_risk.any():
            at_risk_shap = shap_values[predicted_at_risk]
            not_at_risk_shap = shap_values[~predicted_at_risk]
            
            at_risk_avg_shap = np.abs(at_risk_shap).mean()
            not_at_risk_avg_shap = np.abs(not_at_risk_shap).mean()
            
            shap_separation = at_risk_avg_shap - not_at_risk_avg_shap
            
            model_confidence = "HIGH" if shap_separation > 0.1 else "MODERATE"
            insights.append(KeyInsight(
                insight=f'SHAP MODEL CONFIDENCE: {model_confidence} separation between at-risk ({at_risk_avg_shap:.3f}) and stable ({not_at_risk_avg_shap:.3f}) students - {shap_separation:.3f} difference'
            ))
    
    # NEW: SHAP-based seasonal pattern detection
    if shap_values is not None and feature_names is not None:
        # Look for temporal features that might indicate seasonal patterns
        temporal_features = [f for f in feature_names if any(keyword in f.lower() for keyword in ['month', 'quarter', 'season', 'period', 'week'])]
        
        if temporal_features:
            temporal_shap = shap_values[:, [i for i, f in enumerate(feature_names) if f in temporal_features]]
            seasonal_impact = np.abs(temporal_shap).mean(axis=0)
            
            if len(seasonal_impact) > 0:
                most_impactful_period = temporal_features[np.argmax(seasonal_impact)]
                seasonal_strength = seasonal_impact.max()
                
                insights.append(KeyInsight(
                    insight=f'SHAP SEASONAL INSIGHT: {most_impactful_period} shows strongest temporal impact ({seasonal_strength:.3f}) - consider time-specific interventions'
                ))
    
    # NEW: SHAP-based intervention priority ranking
    if shap_values is not None and feature_names is not None and 'Predictions' in df.columns:
        at_risk_students = df[df['Predictions'] == 1]
        
        if len(at_risk_students) > 0:
            # Calculate intervention priority score
            at_risk_indices = at_risk_students.index
            at_risk_shap = shap_values[at_risk_indices]
            
            # Priority = combination of SHAP impact and current attendance
            shap_scores = np.abs(at_risk_shap).sum(axis=1)
            attendance_scores = 100 - at_risk_students['Predicted_Attendance'].values
            
            # Normalize both scores and combine
            normalized_shap = (shap_scores - shap_scores.min()) / (shap_scores.max() - shap_scores.min()) if shap_scores.max() > shap_scores.min() else np.zeros_like(shap_scores)
            normalized_attendance = (attendance_scores - attendance_scores.min()) / (attendance_scores.max() - attendance_scores.min()) if attendance_scores.max() > attendance_scores.min() else np.zeros_like(attendance_scores)
            
            priority_scores = (normalized_shap + normalized_attendance) / 2
            
            # Top priority students
            top_priority_count = max(1, int(len(priority_scores) * 0.2))  # Top 20%
            top_priority_threshold = np.percentile(priority_scores, 80)
            
            high_priority_students = len(priority_scores[priority_scores >= top_priority_threshold])
            avg_priority_score = priority_scores.mean()
            
            insights.append(KeyInsight(
                insight=f'SHAP INTERVENTION PRIORITY: {high_priority_students} students identified as highest priority for immediate intervention (avg priority score: {avg_priority_score:.3f})'
            ))
    
    # NEW: SHAP-based success factor identification
    if shap_values is not None and feature_names is not None:
        # Identify features that consistently contribute to positive outcomes
        high_performers = df[df['Predicted_Attendance'] > df['Predicted_Attendance'].quantile(0.8)]
        
        if len(high_performers) > 0:
            high_performer_indices = high_performers.index
            high_performer_shap = shap_values[high_performer_indices]
            
            # Find features with consistently positive SHAP values
            positive_contributions = (high_performer_shap > 0).mean(axis=0)
            avg_positive_impact = high_performer_shap.mean(axis=0)
            
            # Identify most consistent positive factors
            success_factors = []
            for i, (consistency, impact) in enumerate(zip(positive_contributions, avg_positive_impact)):
                if consistency > 0.6 and impact > 0.01:  # 60% consistency and meaningful impact
                    success_factors.append((feature_names[i], consistency, impact))
            
            if success_factors:
                # Sort by impact and take top 2
                success_factors.sort(key=lambda x: x[2], reverse=True)
                top_factors = success_factors[:2]
                
                factor_names = [f[0] for f in top_factors]
                factor_impacts = [f[2] for f in top_factors]
                
                insights.append(KeyInsight(
                    insight=f'SHAP SUCCESS FACTORS: {", ".join(factor_names)} consistently support high attendance with impacts {", ".join([f"{imp:.3f}" for imp in factor_impacts])} - replicate these conditions'
                ))
    
    # NEW: SHAP-based risk escalation timeline
    if shap_values is not None and 'Prediction_Probability' in df.columns:
        at_risk_students = df[df['Predictions'] == 1]
        
        if len(at_risk_students) > 0:
            # Categorize by risk escalation based on SHAP values and probability
            at_risk_indices = at_risk_students.index
            at_risk_shap = np.abs(shap_values[at_risk_indices]).sum(axis=1)
            probabilities = at_risk_students['Prediction_Probability'].values
            
            # Create risk escalation categories
            immediate_risk = (probabilities > 0.8) & (at_risk_shap > np.percentile(at_risk_shap, 75))
            short_term_risk = (probabilities > 0.6) & (probabilities <= 0.8) & (at_risk_shap > np.percentile(at_risk_shap, 50))
            medium_term_risk = (probabilities > 0.4) & (probabilities <= 0.6)
            
            immediate_count = immediate_risk.sum()
            short_term_count = short_term_risk.sum()
            medium_term_count = medium_term_risk.sum()
            
            if immediate_count > 0:
                insights.append(KeyInsight(
                    insight=f'SHAP ESCALATION TIMELINE: {immediate_count} students need IMMEDIATE action (within 1 week), {short_term_count} need SHORT-TERM intervention (within 1 month), {medium_term_count} need MEDIUM-TERM monitoring'
                ))
    
    # NEW: SHAP-based resource allocation recommendation
    if shap_values is not None and feature_names is not None:
        # Identify which types of interventions would be most effective
        feature_categories = {
            'academic': ['grade', 'score', 'test', 'homework', 'assignment', 'gpa'],
            'behavioral': ['discipline', 'behavior', 'suspension', 'detention', 'conduct'],
            'social': ['peer', 'social', 'friend', 'group', 'interaction'],
            'family': ['parent', 'family', 'home', 'guardian', 'contact'],
            'health': ['health', 'medical', 'illness', 'sick', 'absent']
        }
        
        category_impacts = {}
        for category, keywords in feature_categories.items():
            category_features = [i for i, f in enumerate(feature_names) if any(keyword in f.lower() for keyword in keywords)]
            if category_features:
                category_shap = shap_values[:, category_features]
                category_impacts[category] = np.abs(category_shap).mean()
        
        if category_impacts:
            # Find most impactful category
            most_impactful_category = max(category_impacts, key=category_impacts.get) # type:ignore
            impact_score = category_impacts[most_impactful_category]
            
            # Calculate resource allocation suggestion
            total_impact = sum(category_impacts.values())
            allocation_pct = (impact_score / total_impact) * 100
            
            insights.append(KeyInsight(
                insight=f'SHAP RESOURCE ALLOCATION: {most_impactful_category.upper()} interventions show highest impact ({impact_score:.3f}) - allocate {allocation_pct:.1f}% of intervention resources to this area'
            ))
    
    # NEW: Attendance trend analysis
    if 'Total_Days_Present' in df.columns and 'Total_Days_Enrolled' in df.columns:
        # Calculate attendance rate for better analysis
        df['Attendance_Rate'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
        
        # Identify students with extremely low attendance (less than 10%)
        extremely_low = df[df['Attendance_Rate'] < 10]
        if len(extremely_low) > 0:
            avg_days_present = extremely_low['Total_Days_Present'].mean()
            avg_days_enrolled = extremely_low['Total_Days_Enrolled'].mean()
            
            insights.append(KeyInsight(
                insight=f'EXTREME ABSENTEEISM: {len(extremely_low)} students ({len(extremely_low)/total_students*100:.1f}%) attending less than 10% of school days - avg {avg_days_present:.1f} days present out of {avg_days_enrolled:.1f} enrolled'
            ))
        
        # Identify perfect attendance students
        perfect_attendance = df[df['Attendance_Rate'] >= 95]
        if len(perfect_attendance) > 0:
            insights.append(KeyInsight(
                insight=f'EXCELLENT ATTENDANCE: {len(perfect_attendance)} students ({len(perfect_attendance)/total_students*100:.1f}%) maintain 95%+ attendance - potential peer mentors for intervention programs'
            ))
    
    # NEW: Enrollment vs attendance correlation
    if 'Total_Days_Enrolled' in df.columns:
        enrollment_analysis = df.groupby('Total_Days_Enrolled').agg({
            'Predicted_Attendance': 'mean',
            'Total_Days_Present': 'mean'
        }).round(2)
        
        # Find enrollment periods with lowest attendance
        if len(enrollment_analysis) > 1:
            lowest_attendance_period = enrollment_analysis['Predicted_Attendance'].idxmin()
            lowest_attendance_rate = enrollment_analysis.loc[lowest_attendance_period, 'Predicted_Attendance']
            
            students_in_period = len(df[df['Total_Days_Enrolled'] == lowest_attendance_period])
            
            insights.append(KeyInsight(
                insight=f'ENROLLMENT IMPACT: Students enrolled for {lowest_attendance_period} days show lowest attendance ({lowest_attendance_rate:.1f}%) - {students_in_period} students affected, review mid-year enrollment support'
            ))
    
    # NEW: Attendance distribution analysis
    if 'Predicted_Attendance' in df.columns:
        attendance_quartiles = df['Predicted_Attendance'].quantile([0.25, 0.5, 0.75]).round(1)
        
        # Identify the attendance gaps
        q1_to_q2_gap = attendance_quartiles[0.5] - attendance_quartiles[0.25]
        q2_to_q3_gap = attendance_quartiles[0.75] - attendance_quartiles[0.5]
        
        if q1_to_q2_gap > q2_to_q3_gap * 2:  # Large gap in lower quartiles
            insights.append(KeyInsight(
                insight=f'ATTENDANCE INEQUALITY: Large gap between struggling students (Q1: {attendance_quartiles[0.25]}%) and average performers (Q2: {attendance_quartiles[0.5]}%) - {q1_to_q2_gap:.1f}% gap requires targeted support'
            ))
        
        # Count students in each attendance range
        excellent_count = len(df[df['Predicted_Attendance'] >= 90])
        good_count = len(df[df['Predicted_Attendance'].between(80, 89.9)])
        concerning_count = len(df[df['Predicted_Attendance'].between(70, 79.9)])
        critical_count = len(df[df['Predicted_Attendance'] < 70])
        
        insights.append(KeyInsight(
            insight=f'ATTENDANCE DISTRIBUTION: Excellent (90%+): {excellent_count} students, Good (80-89%): {good_count}, Concerning (70-79%): {concerning_count}, Critical (<70%): {critical_count}'
        ))
    
    # NEW: Unexcused vs excused absence patterns
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
        # Calculate excused absences
        if 'Total_Days_Present' in df.columns:
            df['Total_Days_Absent'] = df['Total_Days_Enrolled'] - df['Total_Days_Present']
            df['Total_Days_Excused_Absent'] = df['Total_Days_Absent'] - df['Total_Days_Unexcused_Absent']
            df['Excused_Rate'] = df['Total_Days_Excused_Absent'] / df['Total_Days_Enrolled'] * 100
            
            # Students with high excused absences (might indicate health/family issues)
            high_excused = df[df['Excused_Rate'] > 15]
            if len(high_excused) > 0:
                avg_excused_rate = high_excused['Excused_Rate'].mean()
                insights.append(KeyInsight(
                    insight=f'HIGH EXCUSED ABSENCES: {len(high_excused)} students ({len(high_excused)/total_students*100:.1f}%) with {avg_excused_rate:.1f}% avg excused absence rate - may need health/family support services'
                ))
            
            # Students with balanced absence patterns
            balanced_absences = df[
                (df['UNEXCUSED_ABSENT_RATE'] < 10) & 
                (df['Excused_Rate'] < 10) & 
                (df['Predicted_Attendance'] > 80)
            ]
            if len(balanced_absences) > 0:
                insights.append(KeyInsight(
                    insight=f'HEALTHY ABSENCE PATTERNS: {len(balanced_absences)} students ({len(balanced_absences)/total_students*100:.1f}%) maintain good attendance with balanced excused/unexcused patterns - model behavior for peer programs'
                ))
    
    # NEW: Risk escalation insights
    if 'TIER' in df.columns:
        # Students who might be moving between tiers
        tier_2_at_risk = df[df['TIER'] == 'Tier 2']
        tier_3_opportunities = df[df['TIER'] == 'Tier 3']
        
        if len(tier_2_at_risk) > 0 and 'Predicted_Attendance' in df.columns:
            tier_2_low_attendance = tier_2_at_risk[tier_2_at_risk['Predicted_Attendance'] < 75]
            if len(tier_2_low_attendance) > 0:
                insights.append(KeyInsight(
                    insight=f'TIER ESCALATION RISK: {len(tier_2_low_attendance)} Tier 2 students ({len(tier_2_low_attendance)/len(tier_2_at_risk)*100:.1f}% of Tier 2) showing decline signs - prevent escalation to Tier 3'
                ))
        
        if len(tier_3_opportunities) > 0 and 'Predicted_Attendance' in df.columns:
            tier_3_improving = tier_3_opportunities[tier_3_opportunities['Predicted_Attendance'] > 70]
            if len(tier_3_improving) > 0:
                insights.append(KeyInsight(
                    insight=f'TIER IMPROVEMENT OPPORTUNITY: {len(tier_3_improving)} Tier 3 students ({len(tier_3_improving)/len(tier_3_opportunities)*100:.1f}% of Tier 3) showing improvement potential - intensive support could move to Tier 2'
                ))
    
    # NEW: School-wide attendance health score
    if 'Predicted_Attendance' in df.columns:
        school_avg_attendance = df['Predicted_Attendance'].mean()
        attendance_std = df['Predicted_Attendance'].std()
        
        # Calculate consistency score
        consistency_score = 100 - (attendance_std / school_avg_attendance * 100)
        
        if school_avg_attendance > 85:
            health_status = "EXCELLENT"
        elif school_avg_attendance > 75:
            health_status = "GOOD"
        elif school_avg_attendance > 65:
            health_status = "NEEDS IMPROVEMENT"
        else:
            health_status = "CRITICAL"
        
        insights.append(KeyInsight(
            insight=f'SCHOOL ATTENDANCE HEALTH: {health_status} - {school_avg_attendance:.1f}% average attendance with {consistency_score:.1f}% consistency score (higher is better)'
        ))
    
    # NEW: Intervention capacity planning
    if 'TIER' in df.columns:
        intervention_needed = len(df[df['TIER'].isin(['Tier 3', 'Tier 4'])])
        monitoring_needed = len(df[df['TIER'] == 'Tier 2'])
        
        # Calculate intervention ratios
        intensive_ratio = intervention_needed / total_students * 100
        monitoring_ratio = monitoring_needed / total_students * 100
        
        if intensive_ratio > 30:
            capacity_status = "OVERWHELMED"
        elif intensive_ratio > 20:
            capacity_status = "HIGH DEMAND"
        elif intensive_ratio > 10:
            capacity_status = "MANAGEABLE"
        else:
            capacity_status = "OPTIMAL"
        
        insights.append(KeyInsight(
            insight=f'INTERVENTION CAPACITY: {capacity_status} - {intervention_needed} students need intensive intervention ({intensive_ratio:.1f}%), {monitoring_needed} need monitoring ({monitoring_ratio:.1f}%) - plan staff allocation accordingly'
        ))
    
    return insights