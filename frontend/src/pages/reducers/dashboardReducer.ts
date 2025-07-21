import type { AppState, AppAction } from "@/types/dashboard.types"

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
    isApplyingFilters: false,
    isResetting: false,
  },
  errors: {
    generalError: null,
    downloadError: null,
    gradeRiskError: null,
    filterError: null,
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
  dataCache: new Map(),
}

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.field]: action.payload.value,
        },
      }
    case "RESET_FILTERS":
      return {
        ...state,
        filters: { district: "", school: "", grade: "" },
        selectedSchoolForGrades: null,
        ui: { ...state.ui, isGlobalView: true },
        errors: { ...state.errors, filterError: null },
      }
    case "SET_OPTIONS":
      return {
        ...state,
        options: { ...state.options, ...action.payload },
      }
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      }
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, ...action.payload },
      }
    case "CLEAR_ERRORS":
      return {
        ...state,
        errors: { generalError: null, downloadError: null, gradeRiskError: null, filterError: null },
      }
    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      }
    case "SET_ANALYSIS_DATA":
      return {
        ...state,
        analysisData: action.payload,
      }
    case "SET_LOAD_TIMER":
      return {
        ...state,
        loadTimer: action.payload,
      }
    case "SET_GRADE_RISKS":
      return {
        ...state,
        gradeRisks: action.payload,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: null },
      }
    case "SET_GRADE_RISKS_LOADING":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: action.payload },
      }
    case "SET_GRADE_RISKS_ERROR":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: action.payload },
      }
    case "SET_DISTRICT_SCHOOL_RISKS":
      return {
        ...state,
        districtSchoolRisks: action.payload,
      }
    case "SET_SELECTED_SCHOOL_FOR_GRADES":
      return {
        ...state,
        selectedSchoolForGrades: action.payload,
      }
    case "SET_CACHE":
      const newCache = new Map(state.dataCache)
      newCache.set(action.payload.key, action.payload.data)
      return {
        ...state,
        dataCache: newCache,
      }
    case "CLEAR_CACHE":
      return {
        ...state,
        dataCache: new Map(),
      }
    default:
      return state
  }
}
