class AlertsUtils:
    def assign_tiers(self, attendance_percentage: float | int) -> str:
        if attendance_percentage >= 95:
            return 'Tier 1'
        elif attendance_percentage >= 90:
            return 'Tier 2'
        elif attendance_percentage >= 80:
            return 'Tier 3'
        else:
            return 'Tier 4'
        
    
    def assign_risk_level(self, attendance: float | int) -> str:
        if attendance >= 95:
            return 'Low'
        elif attendance >= 90:
            return 'Medium'
        elif attendance >= 80:
            return 'High'
        else:
            return 'Critical'
        


al_utils = AlertsUtils()