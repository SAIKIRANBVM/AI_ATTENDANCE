// All interfaces and types for the dashboard
export interface DistrictOption {
  value: string;
  label: string;
}

export interface SchoolOption {
  value: string;
  label: string;
  district?: string;
  location_id?: string;
  key?: string;
}

export interface GradeOption {
  value: string;
  label: string;
  school?: string;
  district?: string;
}

export interface SummaryStatistics {
  totalStudents: number;
  below85Students: number;
  tier1Students: number;
  tier2Students: number;
  tier3Students: number;
  tier4Students: number;
}

export interface InsightItem {
  text?: string;
  insight?: string;
}

export interface RecommendationItem {
  text?: string;
  recommendation?: string;
}

export interface PrioritySchool {
  schoolName: string;
  district: string;
  riskPercentage: number;
  studentCount?: number;
  SCHOOL_NAME?: string;
  DISTRICT_NAME?: string;
}

export interface GradeRisk {
  grade: string | number;
  grade_level?: number;
  count: number;
  riskPercentage?: number;
}

export interface AnalysisData {
  summaryStatistics: SummaryStatistics;
  keyInsights: Array<string | InsightItem>;
  recommendations: Array<string | RecommendationItem>;
  alertsNotifications?: {
    totalBelow60: number;
    byDistrict: Array<{ district: string; count: number }>;
    bySchool: Array<{ school: string; count: number }>;
    byGrade: GradeRisk[];
  };
  totalBelow60?: number;
  byDistrict?: Array<{ district: string; count: number }>;
  bySchool?: Array<{ school: string; count: number }>;
  byGrade?: GradeRisk[];
}

export interface ApiErrorResponse {
  detail?: string;
}

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    headers?: Record<string, any>;
  };
  request?: any;
  message?: string;
}

export interface SearchCriteria {
  districtCode?: string;
  gradeCode?: string;
  schoolCode?: string;
}

export interface DownloadCriteria extends SearchCriteria {
  reportType?: string;
}

export interface FilterState {
  district: string;
  school: string;
  grade: string;
}

export interface OptionsState {
  districtOptions: DistrictOption[];
  schoolOptions: SchoolOption[];
  gradeOptions: GradeOption[];
  allSchoolOptions: SchoolOption[];
}

export interface LoadingState {
  isLoading: boolean;
  isInitialLoad: boolean;
  isDownloadingReport: boolean;
  isProcessingAI: boolean;
  isLoadingGradeRisks: boolean;
}

export interface ErrorState {
  generalError: string | null;
  downloadError: string | null;
  gradeRiskError: string | null;
}

export interface UIState {
  isGlobalView: boolean;
  showFilters: boolean;
  notificationsEnabled: boolean;
}

export interface GradeRiskItem {
  grade: string;
  risk_percentage: number;
  student_count: number;
}

export interface DistrictSchoolRisk {
  schoolName: string;
  riskPercentage: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  studentCount: number;
  district: string;
}

export interface AppState {
  filters: FilterState;
  options: OptionsState;
  loading: LoadingState;
  errors: ErrorState;
  ui: UIState;
  analysisData: AnalysisData | null;
  loadTimer: NodeJS.Timeout | null;
  gradeRisks: GradeRiskItem[];
  districtSchoolRisks: DistrictSchoolRisk[];
  selectedSchoolForGrades: string | null;
  fullDistrictSchoolList: SchoolOption[];
}

export interface SimulationState {
  tier1Improvement: number;
  tier2Improvement: number;
  tier3Improvement: number;
  tier4Improvement: number;
  isProcessing: boolean;
  isExpanded: boolean;
}

export interface ProjectedOutcome {
  tier: number;
  currentStudents: number;
  improvedStudents: number;
  improvementPercentage: number;
  strategyImpact?: number;
  projectedStudents: number;
}

export interface ComparisonData {
  name: string;
  current: number;
  projected: number;
  color: string;
}

export type AppAction =
  | { type: "SET_FILTER"; payload: { field: keyof FilterState; value: string } }
  | { type: "RESET_FILTERS" }
  | { type: "SET_OPTIONS"; payload: Partial<OptionsState> }
  | { type: "SET_LOADING"; payload: Partial<LoadingState> }
  | { type: "SET_ERROR"; payload: Partial<ErrorState> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_UI"; payload: Partial<UIState> }
  | { type: "SET_ANALYSIS_DATA"; payload: AnalysisData | null }
  | { type: "SET_LOAD_TIMER"; payload: NodeJS.Timeout | null }
  | { type: "SET_GRADE_RISKS"; payload: GradeRiskItem[] }
  | { type: "SET_GRADE_RISKS_LOADING"; payload: boolean }
  | { type: "SET_GRADE_RISKS_ERROR"; payload: string | null }
  | { type: "SET_DISTRICT_SCHOOL_RISKS"; payload: DistrictSchoolRisk[] }
  | { type: "SET_SELECTED_SCHOOL_FOR_GRADES"; payload: string | null }
  | { type: "SET_FULL_DISTRICT_SCHOOL_LIST"; payload: SchoolOption[] };

export interface AlertNotification {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: Date;
  isCritical?: boolean;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  description: (data: AnalysisData) => string;
  type: "info" | "warning" | "success" | "error";
  isCritical?: boolean;
}

export interface CategorizedInsight {
  category: string;
  icon: string;
  color: string;
  items: Array<{
    text: string;
    confidence: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export interface CategorizedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  color: string;
  items: Array<{
    text: string;
    confidence: number;
  }>;
}

export const initialState: AppState = {
  filters: { district: "", school: "", grade: "" },
  options: {
    districtOptions: [],
    schoolOptions: [],
    gradeOptions: [],
    allSchoolOptions: [],
  },
  loading: {
    isLoading: true,
    isInitialLoad: true,
    isDownloadingReport: false,
    isProcessingAI: false,
    isLoadingGradeRisks: false,
  },
  errors: {
    generalError: null,
    downloadError: null,
    gradeRiskError: null,
  },
  ui: {
    isGlobalView: false,
    showFilters: true,
    notificationsEnabled: true,
  },
  analysisData: null,
  loadTimer: null,
  gradeRisks: [],
  districtSchoolRisks: [],
  selectedSchoolForGrades: null,
  fullDistrictSchoolList: [],
};
