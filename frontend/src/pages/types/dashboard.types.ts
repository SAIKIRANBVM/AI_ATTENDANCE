export interface DistrictOption {
  value: string
  label: string
}

export interface SchoolOption {
  value: string
  label: string
  district?: string
  location_id?: string
  key?: string
}

export interface GradeOption {
  value: string
  label: string
  school?: string
  district?: string
}

export interface SummaryStatistics {
  totalStudents: number
  below85Students: number
  tier1Students: number
  tier2Students: number
  tier3Students: number
  tier4Students: number
}

export interface InsightItem {
  text?: string
  insight?: string
}

export interface RecommendationItem {
  text?: string
  recommendation?: string
}

export interface PrioritySchool {
  schoolName: string
  district: string
  riskPercentage: number
  studentCount?: number
  SCHOOL_NAME?: string
  DISTRICT_NAME?: string
}

export interface GradeRisk {
  grade: string | number
  grade_level?: number
  count: number
  riskPercentage?: number
}

export interface AnalysisData {
  summaryStatistics: SummaryStatistics
  keyInsights: Array<string | InsightItem>
  recommendations: Array<string | RecommendationItem>
  alertsNotifications?: {
    totalBelow60: number
    byDistrict: Array<{ district: string; count: number }>
    bySchool: Array<{ school: string; count: number }>
    byGrade: GradeRisk[]
  }
  totalBelow60?: number
  byDistrict?: Array<{ district: string; count: number }>
  bySchool?: Array<{ school: string; count: number }>
  byGrade?: GradeRisk[]
}

export interface FilterState {
  district: string
  school: string
  grade: string
}

export interface OptionsState {
  districtOptions: DistrictOption[]
  schoolOptions: SchoolOption[]
  gradeOptions: GradeOption[]
  allSchoolOptions: SchoolOption[]
}

export interface LoadingState {
  isLoading: boolean
  isInitialLoad: boolean
  isDownloadingReport: boolean
  isProcessingAI: boolean
  isLoadingGradeRisks: boolean
  isApplyingFilters: boolean
  isResetting: boolean
}

export interface ErrorState {
  generalError: string | null
  downloadError: string | null
  gradeRiskError: string | null
  filterError: string | null
}

export interface UIState {
  isGlobalView: boolean
  showFilters: boolean
  notificationsEnabled: boolean
}

export interface GradeRiskItem {
  grade: string
  risk_percentage: number
  student_count: number
}

export interface DistrictSchoolRisk {
  schoolName: string
  riskPercentage: number
  riskLevel: "Critical" | "High" | "Medium" | "Low"
  studentCount: number
  district: string
}

export interface AlertNotification {
  id: string
  title: string
  description: string
  type: "info" | "warning" | "success" | "error"
  timestamp: Date
  isCritical?: boolean
}

export interface AppState {
  filters: FilterState
  options: OptionsState
  loading: LoadingState
  errors: ErrorState
  ui: UIState
  analysisData: AnalysisData | null
  loadTimer: NodeJS.Timeout | null
  gradeRisks: GradeRiskItem[]
  districtSchoolRisks: DistrictSchoolRisk[]
  selectedSchoolForGrades: string | null
  dataCache: Map<string, any>
}

export interface SimulationState {
  tier1Improvement: number
  tier2Improvement: number
  tier3Improvement: number
  tier4Improvement: number
  isProcessing: boolean
  isExpanded: boolean
}

export interface ProjectedOutcome {
  tier: number
  currentStudents: number
  improvedStudents: number
  improvementPercentage: number
  strategyImpact?: number
  projectedStudents: number
}

export interface CategorizedInsight {
  category: string
  icon: string
  color: string
  items: Array<{
    text: string
    confidence: number
    priority: "HIGH" | "MEDIUM" | "LOW"
  }>
}

export interface CategorizedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW"
  icon: string
  color: string
  items: Array<{
    text: string
    confidence: number
  }>
}
