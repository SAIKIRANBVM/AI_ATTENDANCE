import pandas as pd
import numpy as np
from backend.classes.Recommendation import Recommendation

def generate_ai_recommendations(df, shap_values=None, feature_names=None):
    recommendations = []
    
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    # SHAP-based feature importance insights for recommendations
    if shap_values is not None and feature_names is not None:
        # Calculate global feature importance from SHAP values
        shap_importance = np.abs(shap_values).mean(axis=0)
        top_features = np.argsort(shap_importance)[-5:][::-1]  # Top 5 most important features
        
        for i, feature_idx in enumerate(top_features):
            feature_name = feature_names[feature_idx]
            importance_score = shap_importance[feature_idx]
            
            # Generate feature-specific recommendations
            if 'grade' in feature_name.lower() or 'STUDENT_GRADE_LEVEL' in feature_name:
                recommendations.append(
                    Recommendation(
                        recommendation=f"SHAP INSIGHT #{i+1}: Grade level shows {importance_score:.3f} impact on attendance predictions - implement grade-specific interventions"
                    )
                )
            elif 'unexcused' in feature_name.lower():
                recommendations.append(
                    Recommendation(
                        recommendation=f"SHAP INSIGHT #{i+1}: Unexcused absences (impact: {importance_score:.3f}) are key predictor - prioritize family engagement programs"
                    )
                )
            elif 'day' in feature_name.lower():
                recommendations.append(
                    Recommendation(
                        recommendation=f"SHAP INSIGHT #{i+1}: Day-of-week patterns (impact: {importance_score:.3f}) significantly affect attendance - consider flexible scheduling"
                    )
                )
            else:
                recommendations.append(
                    Recommendation(
                        recommendation=f"SHAP INSIGHT #{i+1}: {feature_name} shows {importance_score:.3f} predictive impact - target interventions around this factor"
                    )
                )
    
    # SHAP-based dynamic intervention timing recommendations
    if shap_values is not None and feature_names is not None:
        # Identify students with rapidly changing SHAP patterns
        shap_variance = np.var(shap_values, axis=1)
        high_variance_students = np.where(shap_variance > np.percentile(shap_variance, 75))[0]
        
        if len(high_variance_students) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"DYNAMIC INTERVENTION TIMING: {len(high_variance_students)} students show volatile attendance patterns (high SHAP variance) - implement weekly monitoring with flexible response protocols"
                )
            )
        
        # Identify features with seasonal/temporal impact
        if len(shap_values) > 30:  # Enough data for temporal analysis
            recent_shap = shap_values[-15:]  # Last 15 records
            older_shap = shap_values[:-15]
            
            recent_importance = np.abs(recent_shap).mean(axis=0)
            older_importance = np.abs(older_shap).mean(axis=0)
            
            changing_features = np.where(np.abs(recent_importance - older_importance) > 0.05)[0]
            if len(changing_features) > 0:
                top_changing_feature = feature_names[changing_features[np.argmax(np.abs(recent_importance - older_importance)[changing_features])]]
                recommendations.append(
                    Recommendation(
                        recommendation=f"TEMPORAL PATTERN ALERT: {top_changing_feature} shows evolving impact on attendance - adjust intervention strategies to address changing risk factors"
                    )
                )
    
    # SHAP-based personalized intervention recommendations
    if shap_values is not None and feature_names is not None:
        # Identify students with similar SHAP patterns for group interventions
        from sklearn.cluster import KMeans
        if len(shap_values) > 10:
            try:
                kmeans = KMeans(n_clusters=min(5, len(shap_values)//3), random_state=42)
                shap_clusters = kmeans.fit_predict(shap_values)
                
                unique_clusters = np.unique(shap_clusters)
                for cluster_id in unique_clusters:
                    cluster_mask = shap_clusters == cluster_id
                    cluster_size = np.sum(cluster_mask)
                    
                    if cluster_size > 2:  # Only recommend for meaningful cluster sizes
                        cluster_shap = shap_values[cluster_mask]
                        dominant_feature_idx = np.argmax(np.abs(cluster_shap).mean(axis=0))
                        dominant_feature = feature_names[dominant_feature_idx]
                        
                        recommendations.append(
                            Recommendation(
                                recommendation=f"SHAP CLUSTER INTERVENTION: {cluster_size} students share similar risk patterns driven by {dominant_feature} - implement targeted group intervention program"
                            )
                        )
            except:
                pass  # Skip clustering if it fails
    
    # SHAP-based intervention effectiveness prediction
    if shap_values is not None and feature_names is not None:
        # Identify features most amenable to intervention
        intervention_potential = {}
        for i, feature in enumerate(feature_names):
            if any(keyword in feature.lower() for keyword in ['tardiness', 'unexcused', 'behavior', 'participation']):
                intervention_potential[feature] = np.abs(shap_values[:, i]).mean()
        
        if intervention_potential:
            top_intervention_feature = max(intervention_potential, key=intervention_potential.get) #type:ignore
            potential_impact = intervention_potential[top_intervention_feature]
            
            recommendations.append(
                Recommendation(
                    recommendation=f"HIGH-IMPACT INTERVENTION: Targeting {top_intervention_feature} (SHAP impact: {potential_impact:.3f}) offers maximum attendance improvement potential - prioritize intervention resources here"
                )
            )
    
    # SHAP-based early warning system recommendations
    if shap_values is not None and 'Predicted_Attendance' in df.columns:
        # Identify students with declining SHAP trajectories
        if len(shap_values) > 1:
            total_shap_impact = np.abs(shap_values).sum(axis=1)
            if len(total_shap_impact) > 10:
                # Calculate trend in SHAP values
                recent_trend = np.polyfit(range(len(total_shap_impact)), total_shap_impact, 1)[0]
                
                if recent_trend > 0.01:  # Increasing risk trend
                    at_risk_count = np.sum(total_shap_impact > np.percentile(total_shap_impact, 70))
                    recommendations.append(
                        Recommendation(
                            recommendation=f"SHAP EARLY WARNING: Rising risk trend detected - {at_risk_count} students showing increasing SHAP risk scores, implement proactive outreach immediately"
                        )
                    )
    
    # Risk-based recommendations enhanced with SHAP insights
    if 'RISK_LEVEL' in df.columns:
        risk_counts = df['RISK_LEVEL'].value_counts()
        total_students = len(df)
        
        critical = int(risk_counts.get('Critical', 0))
        high = int(risk_counts.get('High', 0))
        medium = int(risk_counts.get('Medium', 0))
        low = int(risk_counts.get('Low', 0))
        
        # Enhanced with SHAP-based success rate predictions
        if shap_values is not None:
            # Calculate average SHAP contribution for each risk level
            critical_mask = df['RISK_LEVEL'] == 'Critical'
            if critical_mask.any():
                critical_shap_mean = np.abs(shap_values[critical_mask]).mean()
                success_adjustment = min(20, critical_shap_mean * 100)  # SHAP-based adjustment
                critical_success_rate = min(80, 60 + success_adjustment)
            else:
                critical_success_rate = 70
        else:
            critical_success_rate = 70
        
        if critical > 0:
            urgency_level = "URGENT" if critical/total_students > 0.15 else "HIGH PRIORITY"
            recommendations.append(
                Recommendation(
                    recommendation=f"{urgency_level} INTERVENTION: Deploy intensive case management for {critical} Critical-risk students. SHAP-adjusted improvement potential: {critical_success_rate:.0f}%"
                )
            )
        
        if high > 0:
            intervention_type = "group counseling" if high > 10 else "individual mentoring"
            high_success_rate = min(70, 45 + (25 * (1 - high/total_students)))
            recommendations.append(
                Recommendation(
                    recommendation=f"STRATEGIC SUPPORT: Implement {intervention_type} for {high} High-risk students with bi-weekly monitoring. Success probability: {high_success_rate:.0f}%"
                )
            )
        
        if medium > 0:
            communication_method = "automated alerts" if medium > 20 else "personalized outreach"
            medium_prevention_rate = min(60, 30 + (30 * (1 - medium/total_students)))
            recommendations.append(
                Recommendation(
                    recommendation=f"PREVENTIVE MEASURES: Deploy {communication_method} to {medium} Medium-risk students. Prevention effectiveness: {medium_prevention_rate:.0f}%"
                )
            )
        
        if low > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"POSITIVE REINFORCEMENT: Maintain recognition programs for {low} Low-risk students to sustain current attendance patterns"
                )
            )
    
    # SHAP-based individual student recommendations
    if shap_values is not None and feature_names is not None:
        # Find students with highest SHAP values (most at risk)
        total_shap_impact = np.abs(shap_values).sum(axis=1)
        high_impact_students = np.argsort(total_shap_impact)[-min(100, len(df)):][::-1]
        
        if len(high_impact_students) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"SHAP-TARGETED INTERVENTION: Focus on {len(high_impact_students)} students with highest predictive risk factors (avg SHAP impact: {total_shap_impact[high_impact_students].mean():.3f})"
                )
            )
        
        # SHAP-based feature interaction recommendations
        if len(shap_values) > 5:
            feature_correlations = np.corrcoef(shap_values.T)
            high_correlation_pairs = np.where(np.abs(feature_correlations) > 0.6)
            
            unique_pairs = [(i, j) for i, j in zip(high_correlation_pairs[0], high_correlation_pairs[1]) if i < j]
            
            if unique_pairs:
                top_pair = unique_pairs[0]
                feature1, feature2 = feature_names[top_pair[0]], feature_names[top_pair[1]]
                correlation_strength = feature_correlations[top_pair[0], top_pair[1]]
                
                recommendations.append(
                    Recommendation(
                        recommendation=f"SHAP INTERACTION INSIGHT: {feature1} and {feature2} show {correlation_strength:.3f} correlation - design integrated interventions addressing both factors simultaneously"
                    )
                )
    
    # SHAP-based intervention prioritization matrix
    if shap_values is not None and feature_names is not None and 'RISK_LEVEL' in df.columns:
        # Create priority matrix based on SHAP impact and intervention feasibility
        intervention_matrix = {}
        
        for risk_level in ['Critical', 'High', 'Medium']:
            if risk_level in df['RISK_LEVEL'].values:
                risk_mask = df['RISK_LEVEL'] == risk_level
                risk_indices = df[risk_mask].index
                
                if len(risk_indices) > 0:
                    risk_shap = shap_values[risk_indices]
                    avg_shap_impact = np.abs(risk_shap).mean(axis=0)
                    
                    # Find top feature for this risk level
                    top_feature_idx = np.argmax(avg_shap_impact)
                    top_feature = feature_names[top_feature_idx]
                    impact_score = avg_shap_impact[top_feature_idx]
                    
                    intervention_matrix[risk_level] = {
                        'feature': top_feature,
                        'impact': impact_score,
                        'count': len(risk_indices)
                    }
        
        # Generate prioritized recommendations
        if intervention_matrix:
            sorted_priorities = sorted(intervention_matrix.items(), 
                                     key=lambda x: x[1]['impact'] * x[1]['count'], 
                                     reverse=True)
            
            for i, (risk_level, data) in enumerate(sorted_priorities[:3]):
                priority_score = data['impact'] * data['count']
                recommendations.append(
                    Recommendation(
                        recommendation=f"INTERVENTION PRIORITY #{i+1}: {risk_level} risk students - focus on {data['feature']} (priority score: {priority_score:.2f}, affects {data['count']} students)"
                    )
                )
    
    # Enhanced absence pattern analysis with SHAP
    if 'LAST_ABSENCE_DATE' in df.columns:
        df['DAYS_SINCE_LAST_ABSENCE'] = (pd.to_datetime('today') - pd.to_datetime(df['LAST_ABSENCE_DATE'])).dt.days
        
        recent_thresholds = [7, 14, 30]
        for threshold in recent_thresholds:
            recent_absentees = df[df['DAYS_SINCE_LAST_ABSENCE'] < threshold]
            if len(recent_absentees) > 0:
                urgency = "IMMEDIATE" if threshold == 7 else "TIMELY" if threshold == 14 else "FOLLOW-UP"
                intervention_strength = "intensive re-engagement" if threshold == 7 else "proactive outreach" if threshold == 14 else "check-in calls"
                
                # Add SHAP-based urgency adjustment
                shap_urgency = ""
                if shap_values is not None and len(recent_absentees) > 0:
                    recent_indices = recent_absentees.index
                    if len(recent_indices) > 0:
                        avg_shap_impact = np.abs(shap_values[recent_indices]).mean()
                        shap_urgency = f" (SHAP risk score: {avg_shap_impact:.3f})"
                
                recommendations.append(
                    Recommendation(
                        recommendation=f"{urgency} ACTION: Initiate {intervention_strength} for {len(recent_absentees)} students absent within {threshold} days{shap_urgency}"
                    )
                )
                break
    
    # SHAP-enhanced school resource allocation
    if 'SCHOOL_NAME' in df.columns and 'DISTRICT_NAME' in df.columns:
        school_metrics = df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME']).agg({
            'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100,
            'Predicted_Attendance': 'mean',
            'STUDENT_GRADE_LEVEL': 'count'
        }).rename(columns={'STUDENT_GRADE_LEVEL': 'student_count'})
        
        # Enhanced with SHAP-based risk scoring
        if shap_values is not None:
            school_shap_scores = {}
            for (district, school), group in df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME']):
                if len(group) > 0:
                    school_indices = group.index
                    avg_shap_impact = np.abs(shap_values[school_indices]).mean()
                    school_shap_scores[(district, school)] = avg_shap_impact
            
            # Add SHAP scores to school metrics
            for key in school_metrics.index:
                if key in school_shap_scores:
                    school_metrics.loc[key, 'shap_risk'] = school_shap_scores[key]
                else:
                    school_metrics.loc[key, 'shap_risk'] = 0
            
            school_metrics['resource_priority'] = (
                school_metrics['RISK_LEVEL'] * 0.5 + 
                (100 - school_metrics['Predicted_Attendance']) * 0.3 +
                school_metrics['shap_risk'] * 100 * 0.2
            )
        else:
            school_metrics['resource_priority'] = (
                school_metrics['RISK_LEVEL'] * 0.7 + 
                (100 - school_metrics['Predicted_Attendance']) * 0.3
            )
        
        top_schools = school_metrics.nlargest(3, 'resource_priority')
        
        for (district, school), metrics in top_schools.iterrows():
            if metrics['RISK_LEVEL'] > 5:
                resource_level = "additional counselors" if metrics['student_count'] > 100 else "specialized interventionist"
                shap_info = f" (SHAP risk: {metrics.get('shap_risk', 0):.3f})" if shap_values is not None else ""
                recommendations.append(
                    Recommendation(
                        recommendation=f"RESOURCE DEPLOYMENT: Allocate {resource_level} to {school} ({district}) - {metrics['RISK_LEVEL']:.1f}% critical risk{shap_info}"
                    )
                )
    
    # SHAP-enhanced grade-level strategies
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predicted_Attendance': 'mean',
            'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100,
            'STUDENT_GRADE_LEVEL': 'count'
        }).rename(columns={'STUDENT_GRADE_LEVEL': 'student_count'})
        
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
        
        # Focus on grades with significant issues
        problematic_grades = grade_analysis[
            (grade_analysis['RISK_LEVEL'] > 10) | 
            (grade_analysis['Predicted_Attendance'] < 85)
        ]
        
        for grade, metrics in problematic_grades.iterrows():
            if metrics['student_count'] > 5:
                strategy_type = "intensive support program" if metrics['RISK_LEVEL'] > 15 else "targeted intervention"
                shap_info = f" (SHAP impact: {metrics.get('shap_risk', 0):.3f})" if shap_values is not None else ""
                recommendations.append(
                    Recommendation(
                        recommendation=f"GRADE-FOCUSED STRATEGY: Implement {strategy_type} for Grade {grade} - {metrics['RISK_LEVEL']:.1f}% critical risk{shap_info}"
                    )
                )
    
    # SHAP-enhanced performance metrics
    if 'Predicted_Attendance' in df.columns:
        current_avg = df['Predicted_Attendance'].mean()
        
        # SHAP-based improvement potential
        if shap_values is not None:
            avg_shap_impact = np.abs(shap_values).mean()
            shap_based_improvement = min(15, avg_shap_impact * 20)  # Convert SHAP to improvement %
            improvement_target = min(95, current_avg + shap_based_improvement)
            
            recommendations.append(
                Recommendation(
                    recommendation=f"SHAP-OPTIMIZED TARGETS: Current {current_avg:.1f}% baseline, SHAP analysis suggests {improvement_target:.1f}% achievable through targeted interventions"
                )
            )
        else:
            improvement_target = min(95, current_avg + 10)
            recommendations.append(
                Recommendation(
                    recommendation=f"PERFORMANCE TARGETS: Establish {current_avg:.1f}% baseline attendance and target {improvement_target:.1f}% improvement through tiered interventions"
                )
            )
    
    return recommendations