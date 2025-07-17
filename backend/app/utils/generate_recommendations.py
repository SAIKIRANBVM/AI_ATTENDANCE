# import pandas as pd
# import numpy as np
# from backend.classes.Recommendation import Recommendation

# def generate_ai_recommendations(df, shap_values=None, feature_names=None):
#     recommendations = []
    
#     if 'Predicted_Attendance' not in df.columns:
#         df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
#     # SHAP-based feature importance insights for recommendations
#     if shap_values is not None and feature_names is not None:
#         # Calculate global feature importance from SHAP values
#         shap_importance = np.abs(shap_values).mean(axis=0)
#         top_features = np.argsort(shap_importance)[-5:][::-1]  # Top 5 most important features
        
#         for i, feature_idx in enumerate(top_features):
#             feature_name = feature_names[feature_idx]
#             importance_score = shap_importance[feature_idx]
            
#             # Generate feature-specific recommendations
#             if 'grade' in feature_name.lower() or 'STUDENT_GRADE_LEVEL' in feature_name:
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"SHAP INSIGHT #{i+1}: Grade level shows {importance_score:.3f} impact on attendance predictions - implement grade-specific interventions"
#                     )
#                 )
#             elif 'unexcused' in feature_name.lower():
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"SHAP INSIGHT #{i+1}: Unexcused absences (impact: {importance_score:.3f}) are key predictor - prioritize family engagement programs"
#                     )
#                 )
#             elif 'day' in feature_name.lower():
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"SHAP INSIGHT #{i+1}: Day-of-week patterns (impact: {importance_score:.3f}) significantly affect attendance - consider flexible scheduling"
#                     )
#                 )
#             else:
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"SHAP INSIGHT #{i+1}: {feature_name} shows {importance_score:.3f} predictive impact - target interventions around this factor"
#                     )
#                 )
    
#     # SHAP-based dynamic intervention timing recommendations
#     if shap_values is not None and feature_names is not None:
#         # Identify students with rapidly changing SHAP patterns
#         shap_variance = np.var(shap_values, axis=1)
#         high_variance_students = np.where(shap_variance > np.percentile(shap_variance, 75))[0]
        
#         if len(high_variance_students) > 0:
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"DYNAMIC INTERVENTION TIMING: {len(high_variance_students)} students show volatile attendance patterns (high SHAP variance) - implement weekly monitoring with flexible response protocols"
#                 )
#             )
        
#         # Identify features with seasonal/temporal impact
#         if len(shap_values) > 30:  # Enough data for temporal analysis
#             recent_shap = shap_values[-15:]  # Last 15 records
#             older_shap = shap_values[:-15]
            
#             recent_importance = np.abs(recent_shap).mean(axis=0)
#             older_importance = np.abs(older_shap).mean(axis=0)
            
#             changing_features = np.where(np.abs(recent_importance - older_importance) > 0.05)[0]
#             if len(changing_features) > 0:
#                 top_changing_feature = feature_names[changing_features[np.argmax(np.abs(recent_importance - older_importance)[changing_features])]]
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"TEMPORAL PATTERN ALERT: {top_changing_feature} shows evolving impact on attendance - adjust intervention strategies to address changing risk factors"
#                     )
#                 )
    
#     # SHAP-based personalized intervention recommendations
#     if shap_values is not None and feature_names is not None:
#         # Identify students with similar SHAP patterns for group interventions
#         from sklearn.cluster import KMeans
#         if len(shap_values) > 10:
#             try:
#                 kmeans = KMeans(n_clusters=min(5, len(shap_values)//3), random_state=42)
#                 shap_clusters = kmeans.fit_predict(shap_values)
                
#                 unique_clusters = np.unique(shap_clusters)
#                 for cluster_id in unique_clusters:
#                     cluster_mask = shap_clusters == cluster_id
#                     cluster_size = np.sum(cluster_mask)
                    
#                     if cluster_size > 2:  # Only recommend for meaningful cluster sizes
#                         cluster_shap = shap_values[cluster_mask]
#                         dominant_feature_idx = np.argmax(np.abs(cluster_shap).mean(axis=0))
#                         dominant_feature = feature_names[dominant_feature_idx]
                        
#                         recommendations.append(
#                             Recommendation(
#                                 recommendation=f"SHAP CLUSTER INTERVENTION: {cluster_size} students share similar risk patterns driven by {dominant_feature} - implement targeted group intervention program"
#                             )
#                         )
#             except:
#                 pass  # Skip clustering if it fails
    
#     # New Mexico AIP Policy-based Recommendations
#     aip_recommendations = []
    
#     # 1. Root cause analysis for Tiers 3-4
#     if 'TIER' in df.columns:
#         tier3_4_count = df[df['TIER'].isin(['Tier 3', 'Tier 4'])].shape[0]
#         if tier3_4_count > 0:
#             aip_recommendations.append(
#                 Recommendation(
#                     recommendation="📋 ACTION ITEM: Run root cause analysis (5 Whys or fishbone) for Tier 3 and 4 absenteeism cases"
#                 )
#             )
    
#     # 2. Always add 40-day review
#     aip_recommendations.append(
#         Recommendation(
#             recommendation="🔄 40-DAY REVIEW: Monitor attendance outcomes and revise intervention plans after each 40-day cycle"
#         )
#     )
    
#     # 3. Scaling plan for Tier 1 schools
#     if 'TIER' in df.columns and 'SCHOOL_NAME' in df.columns:
#         tier1_schools = df[df['TIER'] == 'Tier 1'].groupby('SCHOOL_NAME').size()
#         large_tier1_schools = tier1_schools[tier1_schools >= 100]
#         if not large_tier1_schools.empty:
#             aip_recommendations.append(
#                 Recommendation(
#                     recommendation="📈 SCALING PLAN: Expand Tier 1 strategies to similar schools with lower attendance"
#                 )
#             )
    
#     # 4. Stakeholder strategy for schools needing improvement
#     if 'DISTRICT_NAME' in df.columns and 'SCHOOL_NAME' in df.columns and 'Predicted_Attendance' in df.columns:
#         school_avg = df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME'])['Predicted_Attendance'].mean()
#         if not school_avg.empty and school_avg.mean() < 90:  # Threshold for needing improvement
#             aip_recommendations.append(
#                 Recommendation(
#                     recommendation="👥 STAKEHOLDER STRATEGY: Launch family meetings, teacher interviews, and peer mentor systems to improve engagement"
#                 )
#             )
    
#     # Add AIP recommendations at the beginning
#     recommendations = aip_recommendations + recommendations
    
#     # SHAP-based intervention effectiveness prediction
#     if shap_values is not None and feature_names is not None:
#         # Identify features most amenable to intervention
#         intervention_potential = {}
#         for i, feature in enumerate(feature_names):
#             if any(keyword in feature.lower() for keyword in ['tardiness', 'unexcused', 'behavior', 'participation']):
#                 intervention_potential[feature] = np.abs(shap_values[:, i]).mean()
        
#         if intervention_potential:
#             top_intervention_feature = max(intervention_potential, key=intervention_potential.get) #type:ignore
#             potential_impact = intervention_potential[top_intervention_feature]
            
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"HIGH-IMPACT INTERVENTION: Targeting {top_intervention_feature} (SHAP impact: {potential_impact:.3f}) offers maximum attendance improvement potential - prioritize intervention resources here"
#                 )
#             )
    
#     # SHAP-based early warning system recommendations
#     if shap_values is not None and 'Predicted_Attendance' in df.columns:
#         # Identify students with declining SHAP trajectories
#         if len(shap_values) > 1:
#             total_shap_impact = np.abs(shap_values).sum(axis=1)
#             if len(total_shap_impact) > 10:
#                 # Calculate trend in SHAP values
#                 recent_trend = np.polyfit(range(len(total_shap_impact)), total_shap_impact, 1)[0]
                
#                 if recent_trend > 0.01:  # Increasing risk trend
#                     at_risk_count = np.sum(total_shap_impact > np.percentile(total_shap_impact, 70))
#                     recommendations.append(
#                         Recommendation(
#                             recommendation=f"SHAP EARLY WARNING: Rising risk trend detected - {at_risk_count} students showing increasing SHAP risk scores, implement proactive outreach immediately"
#                         )
#                     )
    
#     # Risk-based recommendations enhanced with SHAP insights
#     if 'RISK_LEVEL' in df.columns:
#         risk_counts = df['RISK_LEVEL'].value_counts()
#         total_students = len(df)
        
#         critical = int(risk_counts.get('Critical', 0))
#         high = int(risk_counts.get('High', 0))
#         medium = int(risk_counts.get('Medium', 0))
#         low = int(risk_counts.get('Low', 0))
        
#         # Enhanced with SHAP-based success rate predictions
#         if shap_values is not None:
#             # Calculate average SHAP contribution for each risk level
#             critical_mask = df['RISK_LEVEL'] == 'Critical'
#             if critical_mask.any():
#                 critical_shap_mean = np.abs(shap_values[critical_mask]).mean()
#                 success_adjustment = min(20, critical_shap_mean * 100)  # SHAP-based adjustment
#                 critical_success_rate = min(80, 60 + success_adjustment)
#             else:
#                 critical_success_rate = 70
#         else:
#             critical_success_rate = 70
        
#         if critical > 0:
#             urgency_level = "URGENT" if critical/total_students > 0.15 else "HIGH PRIORITY"
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"{urgency_level} INTERVENTION: Deploy intensive case management for {critical} Critical-risk students. SHAP-adjusted improvement potential: {critical_success_rate:.0f}%"
#                 )
#             )
        
#         if high > 0:
#             intervention_type = "group counseling" if high > 10 else "individual mentoring"
#             high_success_rate = min(70, 45 + (25 * (1 - high/total_students)))
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"STRATEGIC SUPPORT: Implement {intervention_type} for {high} High-risk students with bi-weekly monitoring. Success probability: {high_success_rate:.0f}%"
#                 )
#             )
        
#         if medium > 0:
#             communication_method = "automated alerts" if medium > 20 else "personalized outreach"
#             medium_prevention_rate = min(60, 30 + (30 * (1 - medium/total_students)))
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"PREVENTIVE MEASURES: Deploy {communication_method} to {medium} Medium-risk students. Prevention effectiveness: {medium_prevention_rate:.0f}%"
#                 )
#             )
        
#         if low > 0:
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"POSITIVE REINFORCEMENT: Maintain recognition programs for {low} Low-risk students to sustain current attendance patterns"
#                 )
#             )
    
#     # SHAP-based individual student recommendations
#     if shap_values is not None and feature_names is not None:
#         # Find students with highest SHAP values (most at risk)
#         total_shap_impact = np.abs(shap_values).sum(axis=1)
#         high_impact_students = np.argsort(total_shap_impact)[-min(100, len(df)):][::-1]
        
#         if len(high_impact_students) > 0:
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"SHAP-TARGETED INTERVENTION: Focus on {len(high_impact_students)} students with highest predictive risk factors (avg SHAP impact: {total_shap_impact[high_impact_students].mean():.3f})"
#                 )
#             )
        
#         # SHAP-based feature interaction recommendations
#         if len(shap_values) > 5:
#             feature_correlations = np.corrcoef(shap_values.T)
#             high_correlation_pairs = np.where(np.abs(feature_correlations) > 0.6)
            
#             unique_pairs = [(i, j) for i, j in zip(high_correlation_pairs[0], high_correlation_pairs[1]) if i < j]
            
#             if unique_pairs:
#                 top_pair = unique_pairs[0]
#                 feature1, feature2 = feature_names[top_pair[0]], feature_names[top_pair[1]]
#                 correlation_strength = feature_correlations[top_pair[0], top_pair[1]]
                
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"SHAP INTERACTION INSIGHT: {feature1} and {feature2} show {correlation_strength:.3f} correlation - design integrated interventions addressing both factors simultaneously"
#                     )
#                 )
    
#     # SHAP-based intervention prioritization matrix
#     if shap_values is not None and feature_names is not None and 'RISK_LEVEL' in df.columns:
#         # Create priority matrix based on SHAP impact and intervention feasibility
#         intervention_matrix = {}
        
#         for risk_level in ['Critical', 'High', 'Medium']:
#             if risk_level in df['RISK_LEVEL'].values:
#                 risk_mask = df['RISK_LEVEL'] == risk_level
#                 risk_indices = df[risk_mask].index
                
#                 if len(risk_indices) > 0:
#                     risk_shap = shap_values[risk_indices]
#                     avg_shap_impact = np.abs(risk_shap).mean(axis=0)
                    
#                     # Find top feature for this risk level
#                     top_feature_idx = np.argmax(avg_shap_impact)
#                     top_feature = feature_names[top_feature_idx]
#                     impact_score = avg_shap_impact[top_feature_idx]
                    
#                     intervention_matrix[risk_level] = {
#                         'feature': top_feature,
#                         'impact': impact_score,
#                         'count': len(risk_indices)
#                     }
        
#         # Generate prioritized recommendations
#         if intervention_matrix:
#             sorted_priorities = sorted(intervention_matrix.items(), 
#                                      key=lambda x: x[1]['impact'] * x[1]['count'], 
#                                      reverse=True)
            
#             for i, (risk_level, data) in enumerate(sorted_priorities[:3]):
#                 priority_score = data['impact'] * data['count']
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"INTERVENTION PRIORITY #{i+1}: {risk_level} risk students - focus on {data['feature']} (priority score: {priority_score:.2f}, affects {data['count']} students)"
#                     )
#                 )
    
#     # Enhanced absence pattern analysis with SHAP
#     if 'LAST_ABSENCE_DATE' in df.columns:
#         df['DAYS_SINCE_LAST_ABSENCE'] = (pd.to_datetime('today') - pd.to_datetime(df['LAST_ABSENCE_DATE'])).dt.days
        
#         recent_thresholds = [7, 14, 30]
#         for threshold in recent_thresholds:
#             recent_absentees = df[df['DAYS_SINCE_LAST_ABSENCE'] < threshold]
#             if len(recent_absentees) > 0:
#                 urgency = "IMMEDIATE" if threshold == 7 else "TIMELY" if threshold == 14 else "FOLLOW-UP"
#                 intervention_strength = "intensive re-engagement" if threshold == 7 else "proactive outreach" if threshold == 14 else "check-in calls"
                
#                 # Add SHAP-based urgency adjustment
#                 shap_urgency = ""
#                 if shap_values is not None and len(recent_absentees) > 0:
#                     recent_indices = recent_absentees.index
#                     if len(recent_indices) > 0:
#                         avg_shap_impact = np.abs(shap_values[recent_indices]).mean()
#                         shap_urgency = f" (SHAP risk score: {avg_shap_impact:.3f})"
                
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"{urgency} ACTION: Initiate {intervention_strength} for {len(recent_absentees)} students absent within {threshold} days{shap_urgency}"
#                     )
#                 )
#                 break
    
#     # SHAP-enhanced school resource allocation
#     if 'SCHOOL_NAME' in df.columns and 'DISTRICT_NAME' in df.columns:
#         school_metrics = df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME']).agg({
#             'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100,
#             'Predicted_Attendance': 'mean',
#             'STUDENT_GRADE_LEVEL': 'count'
#         }).rename(columns={'STUDENT_GRADE_LEVEL': 'student_count'})
        
#         # Enhanced with SHAP-based risk scoring
#         if shap_values is not None:
#             school_shap_scores = {}
#             for (district, school), group in df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME']):
#                 if len(group) > 0:
#                     school_indices = group.index
#                     avg_shap_impact = np.abs(shap_values[school_indices]).mean()
#                     school_shap_scores[(district, school)] = avg_shap_impact
            
#             # Add SHAP scores to school metrics
#             for key in school_metrics.index:
#                 if key in school_shap_scores:
#                     school_metrics.loc[key, 'shap_risk'] = school_shap_scores[key]
#                 else:
#                     school_metrics.loc[key, 'shap_risk'] = 0
            
#             school_metrics['resource_priority'] = (
#                 school_metrics['RISK_LEVEL'] * 0.5 + 
#                 (100 - school_metrics['Predicted_Attendance']) * 0.3 +
#                 school_metrics['shap_risk'] * 100 * 0.2
#             )
#         else:
#             school_metrics['resource_priority'] = (
#                 school_metrics['RISK_LEVEL'] * 0.7 + 
#                 (100 - school_metrics['Predicted_Attendance']) * 0.3
#             )
        
#         top_schools = school_metrics.nlargest(3, 'resource_priority')
        
#         for (district, school), metrics in top_schools.iterrows():
#             if metrics['RISK_LEVEL'] > 5:
#                 resource_level = "additional counselors" if metrics['student_count'] > 100 else "specialized interventionist"
#                 shap_info = f" (SHAP risk: {metrics.get('shap_risk', 0):.3f})" if shap_values is not None else ""
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"RESOURCE DEPLOYMENT: Allocate {resource_level} to {school} ({district}) - {metrics['RISK_LEVEL']:.1f}% critical risk{shap_info}"
#                     )
#                 )
    
#     # SHAP-enhanced grade-level strategies
#     if 'STUDENT_GRADE_LEVEL' in df.columns:
#         grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
#             'Predicted_Attendance': 'mean',
#             'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100,
#             'STUDENT_GRADE_LEVEL': 'count'
#         }).rename(columns={'STUDENT_GRADE_LEVEL': 'student_count'})
        
#         # Add SHAP-based grade risk assessment
#         if shap_values is not None:
#             grade_shap_scores = {}
#             for grade, group in df.groupby('STUDENT_GRADE_LEVEL'):
#                 if len(group) > 0:
#                     grade_indices = group.index
#                     avg_shap_impact = np.abs(shap_values[grade_indices]).mean()
#                     grade_shap_scores[grade] = avg_shap_impact
            
#             for grade in grade_analysis.index:
#                 grade_analysis.loc[grade, 'shap_risk'] = grade_shap_scores.get(grade, 0)
        
#         # Focus on grades with significant issues
#         problematic_grades = grade_analysis[
#             (grade_analysis['RISK_LEVEL'] > 10) | 
#             (grade_analysis['Predicted_Attendance'] < 85)
#         ]
        
#         for grade, metrics in problematic_grades.iterrows():
#             if metrics['student_count'] > 5:
#                 strategy_type = "intensive support program" if metrics['RISK_LEVEL'] > 15 else "targeted intervention"
#                 shap_info = f" (SHAP impact: {metrics.get('shap_risk', 0):.3f})" if shap_values is not None else ""
#                 recommendations.append(
#                     Recommendation(
#                         recommendation=f"GRADE-FOCUSED STRATEGY: Implement {strategy_type} for Grade {grade} - {metrics['RISK_LEVEL']:.1f}% critical risk{shap_info}"
#                     )
#                 )
    
#     # SHAP-enhanced performance metrics
#     if 'Predicted_Attendance' in df.columns:
#         current_avg = df['Predicted_Attendance'].mean()
        
#         # SHAP-based improvement potential
#         if shap_values is not None:
#             avg_shap_impact = np.abs(shap_values).mean()
#             shap_based_improvement = min(15, avg_shap_impact * 20)  # Convert SHAP to improvement %
#             improvement_target = min(95, current_avg + shap_based_improvement)
            
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"SHAP-OPTIMIZED TARGETS: Current {current_avg:.1f}% baseline, SHAP analysis suggests {improvement_target:.1f}% achievable through targeted interventions"
#                 )
#             )
#         else:
#             improvement_target = min(95, current_avg + 10)
#             recommendations.append(
#                 Recommendation(
#                     recommendation=f"PERFORMANCE TARGETS: Establish {current_avg:.1f}% baseline attendance and target {improvement_target:.1f}% improvement through tiered interventions"
#                 )
#             )
    
#     return recommendations
import pandas as pd
import numpy as np
from backend.classes.Recommendation import Recommendation

def generate_ai_recommendations(df, shap_values=None, feature_names=None):
    recommendations = []
    
    # Calculate attendance rate if not present
    if 'Attendance_Rate' not in df.columns:
        df['Attendance_Rate'] = (df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100).round(2)
    
    # AI-POWERED PREDICTIVE INSIGHTS
    
    # 1. District Performance Intelligence
    if 'DISTRICT_NAME' in df.columns and 'Predictions_District' in df.columns:
        district_analysis = df.groupby('DISTRICT_NAME').agg({
            'Predictions_District': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies districts with prediction-reality gaps
        district_analysis['performance_gap'] = district_analysis['Predictions_District'] - district_analysis['Attendance_Rate']
        
        # Flag districts with significant prediction gaps
        underperforming_districts = district_analysis[district_analysis['performance_gap'] > 5].nlargest(3, 'performance_gap')
        
        for district, metrics in underperforming_districts.iterrows():
            recommendations.append(
                Recommendation(
                    recommendation=f"🎯 AI ALERT: {district} district shows {metrics['performance_gap']:.1f}% prediction gap - implement district-wide attendance coaching program for {metrics['student_count']} students"
                )
            )
    
    # 2. School-Level AI Pattern Detection
    if 'SCHOOL_NAME' in df.columns and 'Predictions_School' in df.columns:
        school_analysis = df.groupby('SCHOOL_NAME').agg({
            'Predictions_School': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'sum',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies schools with unusual patterns
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
    
    # 3. Grade-Level Intelligence System
    if 'STUDENT_GRADE_LEVEL' in df.columns and 'Predictions_Grade' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predictions_Grade': 'mean',
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI detects grade-level anomalies
        grade_analysis['prediction_accuracy'] = abs(grade_analysis['Predictions_Grade'] - grade_analysis['Attendance_Rate'])
        
        # Focus on grades with poor prediction accuracy (indicates changing patterns)
        volatile_grades = grade_analysis[grade_analysis['prediction_accuracy'] > 3].nlargest(3, 'prediction_accuracy')
        
        for grade, metrics in volatile_grades.iterrows():
            recommendations.append(
                Recommendation(
                    recommendation=f"📚 AI GRADE INSIGHT: Grade {grade} shows {metrics['prediction_accuracy']:.1f}% prediction volatility - implement adaptive intervention strategies for {metrics['student_count']} students"
                )
            )
    
    # 4. Demographic-Based AI Recommendations
    if 'STUDENT_GENDER' in df.columns:
        gender_analysis = df.groupby('STUDENT_GENDER').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies gender-specific patterns
        gender_gap = gender_analysis['Attendance_Rate'].max() - gender_analysis['Attendance_Rate'].min()
        if gender_gap > 3:
            lower_performing_gender = gender_analysis['Attendance_Rate'].idxmin()
            recommendations.append(
                Recommendation(
                    recommendation=f"🎭 AI DEMOGRAPHIC INSIGHT: {gender_gap:.1f}% attendance gap detected - implement gender-specific engagement programs for {lower_performing_gender} students"
                )
            )
    
    # 5. Economic Status Intelligence
    if 'ECONOMIC_CODE' in df.columns:
        economic_analysis = df.groupby('ECONOMIC_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies economic risk factors
        if len(economic_analysis) > 1:
            economic_gap = economic_analysis['Attendance_Rate'].max() - economic_analysis['Attendance_Rate'].min()
            if economic_gap > 5:
                at_risk_economic_group = economic_analysis['Attendance_Rate'].idxmin()
                recommendations.append(
                    Recommendation(
                        recommendation=f"💰 AI ECONOMIC INSIGHT: {economic_gap:.1f}% attendance gap by economic status - prioritize family support services for {at_risk_economic_group} code students"
                    )
                )
    
    # 6. Special Education AI Analysis
    if 'SPECIAL_ED_CODE' in df.columns:
        special_ed_analysis = df.groupby('SPECIAL_ED_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI flags special education attendance issues
        if len(special_ed_analysis) > 1:
            special_ed_gap = special_ed_analysis['Attendance_Rate'].max() - special_ed_analysis['Attendance_Rate'].min()
            if special_ed_gap > 4:
                recommendations.append(
                    Recommendation(
                        recommendation=f"♿ AI SPECIAL ED INSIGHT: {special_ed_gap:.1f}% attendance gap in special education - enhance IEP attendance goals and family collaboration"
                    )
                )
    
    # 7. English Proficiency Intelligence
    if 'ENG_PROF_CODE' in df.columns:
        eng_prof_analysis = df.groupby('ENG_PROF_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies language barrier impacts
        if len(eng_prof_analysis) > 1:
            eng_prof_gap = eng_prof_analysis['Attendance_Rate'].max() - eng_prof_analysis['Attendance_Rate'].min()
            if eng_prof_gap > 3:
                recommendations.append(
                    Recommendation(
                        recommendation=f"🗣️ AI LANGUAGE INSIGHT: {eng_prof_gap:.1f}% attendance gap by English proficiency - implement multilingual family engagement programs"
                    )
                )
    
    # 8. Ethnic Diversity AI Recommendations
    if 'ETHNIC_CODE' in df.columns:
        ethnic_analysis = df.groupby('ETHNIC_CODE').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI identifies equity gaps
        if len(ethnic_analysis) > 1:
            ethnic_gap = ethnic_analysis['Attendance_Rate'].max() - ethnic_analysis['Attendance_Rate'].min()
            if ethnic_gap > 4:
                lowest_group = ethnic_analysis['Attendance_Rate'].idxmin()
                recommendations.append(
                    Recommendation(
                        recommendation=f"🌍 AI EQUITY INSIGHT: {ethnic_gap:.1f}% attendance gap by ethnicity - develop culturally responsive interventions for ethnic code {lowest_group}"
                    )
                )
    
    # 9. Hispanic Identity AI Analysis
    if 'HISPANIC_IND' in df.columns:
        hispanic_analysis = df.groupby('HISPANIC_IND').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI Hispanic population insights
        if len(hispanic_analysis) > 1:
            hispanic_gap = hispanic_analysis['Attendance_Rate'].max() - hispanic_analysis['Attendance_Rate'].min()
            if hispanic_gap > 3:
                recommendations.append(
                    Recommendation(
                        recommendation=f"🏛️ AI HISPANIC INSIGHT: {hispanic_gap:.1f}% attendance gap - implement Latino family engagement specialists and bilingual communication strategies"
                    )
                )
    
    # 10. Unexcused Absence Pattern AI
    if 'Total_Days_Unexcused_Absent' in df.columns:
        # AI categorizes students by unexcused absence patterns
        df['unexcused_category'] = pd.cut(df['Total_Days_Unexcused_Absent'], 
                                         bins=[0, 2, 5, 10, float('inf')], 
                                         labels=['Low', 'Medium', 'High', 'Critical'])
        
        unexcused_analysis = df.groupby('unexcused_category').agg({
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
    
    # 11. Multi-Year Trend AI Analysis
    if 'SCHOOL_YEAR' in df.columns and df['SCHOOL_YEAR'].nunique() > 1:
        yearly_trends = df.groupby('SCHOOL_YEAR').agg({
            'Attendance_Rate': 'mean',
            'Total_Days_Unexcused_Absent': 'mean',
            'STUDENT_ID': 'count'
        }).rename(columns={'STUDENT_ID': 'student_count'})
        
        # AI detects year-over-year changes
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
    
    # 12. Prediction Accuracy Intelligence
    if 'Predictions' in df.columns and 'Attendance_Rate' in df.columns:
        df['prediction_error'] = abs(df['Predictions'] - df['Attendance_Rate'])
        
        # AI identifies students with high prediction errors
        high_error_students = df[df['prediction_error'] > 10]
        
        if len(high_error_students) > 0:
            avg_error = high_error_students['prediction_error'].mean()
            recommendations.append(
                Recommendation(
                    recommendation=f"🤖 AI PREDICTION INSIGHT: {len(high_error_students)} students show {avg_error:.1f}% prediction variance - investigate underlying pattern changes and adjust models"
                )
            )
    
    # 13. Cross-Prediction Analysis
    if all(col in df.columns for col in ['Predictions', 'Predictions_District', 'Predictions_School', 'Predictions_Grade']):
        # AI compares prediction consistency across levels
        df['prediction_consistency'] = df[['Predictions', 'Predictions_District', 'Predictions_School', 'Predictions_Grade']].std(axis=1)
        
        inconsistent_students = df[df['prediction_consistency'] > 5]
        
        if len(inconsistent_students) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"🔍 AI CONSISTENCY ALERT: {len(inconsistent_students)} students show inconsistent predictions across levels - requires individualized assessment and intervention planning"
                )
            )
    
    # 14. Enrollment vs Attendance AI Optimization
    if 'Total_Days_Enrolled' in df.columns and 'Total_Days_Present' in df.columns:
        # AI identifies enrollment efficiency patterns
        df['enrollment_efficiency'] = df['Total_Days_Present'] / df['Total_Days_Enrolled']
        
        # Find students with low enrollment efficiency
        low_efficiency = df[df['enrollment_efficiency'] < 0.85]
        
        if len(low_efficiency) > 0:
            avg_efficiency = low_efficiency['enrollment_efficiency'].mean()
            recommendations.append(
                Recommendation(
                    recommendation=f"📊 AI EFFICIENCY INSIGHT: {len(low_efficiency)} students show {avg_efficiency:.1%} enrollment efficiency - optimize scheduling and reduce barriers to attendance"
                )
            )
    
    # 15. AI-Powered Risk Stratification
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Attendance_Rate' in df.columns:
        # AI creates dynamic risk scores
        df['ai_risk_score'] = (
            (100 - df['Attendance_Rate']) * 0.4 +
            (df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100) * 0.4 +
            df.get('prediction_error', 0) * 0.2
        )
        
        # AI segments students into intervention tiers
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
                
                recommendations.append(
                    Recommendation(
                        recommendation=f"🎯 AI RISK TIER: {segment_count} students in {segment} tier (risk score: {avg_risk:.1f}) - deploy {intervention_map[segment]} protocols"
                    )
                )
    
    return recommendations[:15]  # Return top 15 most relevant recommendations