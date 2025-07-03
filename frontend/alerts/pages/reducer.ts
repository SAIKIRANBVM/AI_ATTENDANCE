// // // ============================================================================
// // // TYPE DEFINITIONS
// // // ============================================================================

// // export interface DistrictOption {
// //   value: string;
// //   label: string;
// // }

// // export interface SchoolOption {
// //   value: string;
// //   label: string;
// //   district?: string;
// //   location_id?: string;
// //   key?: string;
// // }

// // export interface GradeOption {
// //   value: string;
// //   label: string;
// //   school?: string;
// //   district?: string;
// // }

// // export interface SummaryStatistics {
// //   total_students: number;
// //   below_85_students: number;
// //   tier1_students: number;
// //   tier4_students: number;
// // }

// // export interface InsightItem {
// //   text?: string;
// //   insight?: string;
// // }

// // export interface RecommendationItem {
// //   text?: string;
// //   recommendation?: string;
// // }

// // export interface AnalysisData {
// //   summary_statistics: SummaryStatistics;
// //   key_insights: Array<string | InsightItem>;
// //   recommendations: Array<string | RecommendationItem>;
// // }

// // export interface ApiErrorResponse {
// //   detail?: string;
// // }

// // export interface ApiError {
// //   response?: {
// //     data?: ApiErrorResponse;
// //     status?: number;
// //     headers?: Record<string, any>;
// //   };
// //   request?: any;
// //   message?: string;
// // }

// // export interface SearchCriteria {
// //   district_code?: string;
// //   grade_code?: string;
// //   school_code?: string;
// //   student_id?: string;
// // }

// // export interface DownloadCriteria extends SearchCriteria {
// //   report_type?: string;
// // }

// // // ============================================================================
// // // STATE INTERFACES
// // // ============================================================================

// // export interface FilterState {
// //   district: string;
// //   school: string;
// //   grade: string;
// // }

// // export interface OptionsState {
// //   districtOptions: DistrictOption[];
// //   schoolOptions: SchoolOption[];
// //   gradeOptions: GradeOption[];
// //   allSchoolOptions: SchoolOption[];
// // }

// // export interface LoadingState {
// //   isLoading: boolean;
// //   isInitialLoad: boolean;
// //   isDownloadingReport: boolean;
// // }

// // export interface ErrorState {
// //   generalError: string | null;
// //   downloadError: string | null;
// // }

// // export interface UIState {
// //   isGlobalView: boolean;
// //   showFilters: boolean;
// // }

// // export interface AppState {
// //   filters: FilterState;
// //   options: OptionsState;
// //   loading: LoadingState;
// //   errors: ErrorState;
// //   ui: UIState;
// //   analysisData: AnalysisData | null;
// //   loadTimer: NodeJS.Timeout | null;
// // }

// // export type AppAction =
// //   | { type: 'SET_FILTER'; payload: { field: keyof FilterState; value: string } }
// //   | { type: 'RESET_FILTERS' }
// //   | { type: 'SET_OPTIONS'; payload: Partial<OptionsState> }
// //   | { type: 'SET_LOADING'; payload: Partial<LoadingState> }
// //   | { type: 'SET_ERROR'; payload: Partial<ErrorState> }
// //   | { type: 'CLEAR_ERRORS' }
// //   | { type: 'SET_UI'; payload: Partial<UIState> }
// //   | { type: 'SET_ANALYSIS_DATA'; payload: AnalysisData | null }
// //   | { type: 'SET_LOAD_TIMER'; payload: NodeJS.Timeout | null };

// // export const initialState: AppState = {
// //   filters: { district: "", school: "", grade: "" },
// //   options: {
// //     districtOptions: [],
// //     schoolOptions: [],
// //     gradeOptions: [],
// //     allSchoolOptions: []
// //   },
// //   loading: {
// //     isLoading: true,
// //     isInitialLoad: true,
// //     isDownloadingReport: false
// //   },
// //   errors: {
// //     generalError: null,
// //     downloadError: null
// //   },
// //   ui: {
// //     isGlobalView: false,
// //     showFilters: true
// //   },
// //   analysisData: null,
// //   loadTimer: null
// // };

// // export const appReducer = (state: AppState, action: AppAction): AppState => {
// //   switch (action.type) {
// //     case 'SET_FILTER':
// //       return {
// //         ...state,
// //         filters: { ...state.filters, [action.payload.field]: action.payload.value }
// //       };
// //     case 'RESET_FILTERS':
// //       return {
// //         ...state,
// //         filters: { district: "", school: "", grade: "" }
// //       };
// //     case 'SET_OPTIONS':
// //       return {
// //         ...state,
// //         options: { ...state.options, ...action.payload }
// //       };
// //     case 'SET_LOADING':
// //       return {
// //         ...state,
// //         loading: { ...state.loading, ...action.payload }
// //       };
// //     case 'SET_ERROR':
// //       return {
// //         ...state,
// //         errors: { ...state.errors, ...action.payload }
// //       };
// //     case 'CLEAR_ERRORS':
// //       return {
// //         ...state,
// //         errors: { generalError: null, downloadError: null }
// //       };
// //     case 'SET_UI':
// //       return {
// //         ...state,
// //         ui: { ...state.ui, ...action.payload }
// //       };
// //     case 'SET_ANALYSIS_DATA':
// //       return {
// //         ...state,
// //         analysisData: action.payload
// //       };
// //     case 'SET_LOAD_TIMER':
// //       return {
// //         ...state,
// //         loadTimer: action.payload
// //       };
// //     default:
// //       return state;
// //   }
// // };

// // ============================================================================
// // TYPE DEFINITIONS
// // ============================================================================

// export interface DistrictOption {
//   value: string;
//   label: string;
// }

// export interface SchoolOption {
//   value: string;
//   label: string;
//   district?: string;
//   location_id?: string;
//   key?: string;
// }

// export interface GradeOption {
//   value: string;
//   label: string;
//   school?: string;
//   district?: string;
// }

// export interface SummaryStatistics {
//   total_students: number;
//   below_85_students: number;
//   tier1_students: number;
//   tier4_students: number;
// }

// export interface InsightItem {
//   text?: string;
//   insight?: string;
// }

// export interface RecommendationItem {
//   text?: string;
//   recommendation?: string;
// }

// export interface AnalysisData {
//   summary_statistics: SummaryStatistics;
//   key_insights: Array<string | InsightItem>;
//   recommendations: Array<string | RecommendationItem>;
// }

// export interface ApiErrorResponse {
//   detail?: string;
// }

// export interface ApiError {
//   response?: {
//     data?: ApiErrorResponse;
//     status?: number;
//     headers?: Record<string, any>;
//   };
//   request?: any;
//   message?: string;
// }

// export interface SearchCriteria {
//   district_code?: string;
//   grade_code?: string;
//   school_code?: string;
//   student_id?: string;
// }

// export interface DownloadCriteria extends SearchCriteria {
//   report_type?: string;
// }

// // ============================================================================
// // STATE MANAGEMENT INTERFACES
// // ============================================================================

// export interface FilterState {
//   district: string;
//   school: string;
//   grade: string;
// }

// export interface OptionsState {
//   districtOptions: DistrictOption[];
//   schoolOptions: SchoolOption[];
//   gradeOptions: GradeOption[];
//   allSchoolOptions: SchoolOption[];
// }

// export interface LoadingState {
//   isLoading: boolean;
//   isInitialLoad: boolean;
//   isDownloadingReport: boolean;
// }

// export interface ErrorState {
//   generalError: string | null;
//   downloadError: string | null;
// }

// export interface UIState {
//   isGlobalView: boolean;
//   showFilters: boolean;
// }

// export interface AppState {
//   filters: FilterState;
//   options: OptionsState;
//   loading: LoadingState;
//   errors: ErrorState;
//   ui: UIState;
//   analysisData: AnalysisData | null;
//   loadTimer: NodeJS.Timeout | null;
// }

// // ============================================================================
// // ACTION TYPES
// // ============================================================================

// export type AppAction =
//   | { type: "SET_FILTER"; payload: { field: keyof FilterState; value: string } }
//   | { type: "RESET_FILTERS" }
//   | { type: "SET_OPTIONS"; payload: Partial<OptionsState> }
//   | { type: "SET_LOADING"; payload: Partial<LoadingState> }
//   | { type: "SET_ERROR"; payload: Partial<ErrorState> }
//   | { type: "CLEAR_ERRORS" }
//   | { type: "SET_UI"; payload: Partial<UIState> }
//   | { type: "SET_ANALYSIS_DATA"; payload: AnalysisData | null }
//   | { type: "SET_LOAD_TIMER"; payload: NodeJS.Timeout | null };

// // ============================================================================
// // INITIAL STATE
// // ============================================================================

// export const initialState: AppState = {
//   filters: { district: "", school: "", grade: "" },
//   options: {
//     districtOptions: [],
//     schoolOptions: [],
//     gradeOptions: [],
//     allSchoolOptions: [],
//   },
//   loading: {
//     isLoading: true,
//     isInitialLoad: true,
//     isDownloadingReport: false,
//   },
//   errors: {
//     generalError: null,
//     downloadError: null,
//   },
//   ui: {
//     isGlobalView: false,
//     showFilters: true,
//   },
//   analysisData: null,
//   loadTimer: null,
// };

// // ============================================================================
// // REDUCER FUNCTION
// // ============================================================================

// export const appReducer = (state: AppState, action: AppAction): AppState => {
//   switch (action.type) {
//     case "SET_FILTER":
//       return {
//         ...state,
//         filters: {
//           ...state.filters,
//           [action.payload.field]: action.payload.value,
//         },
//       };
//     case "RESET_FILTERS":
//       return {
//         ...state,
//         filters: { district: "", school: "", grade: "" },
//       };
//     case "SET_OPTIONS":
//       return {
//         ...state,
//         options: { ...state.options, ...action.payload },
//       };
//     case "SET_LOADING":
//       return {
//         ...state,
//         loading: { ...state.loading, ...action.payload },
//       };
//     case "SET_ERROR":
//       return {
//         ...state,
//         errors: { ...state.errors, ...action.payload },
//       };
//     case "CLEAR_ERRORS":
//       return {
//         ...state,
//         errors: { generalError: null, downloadError: null },
//       };
//     case "SET_UI":
//       return {
//         ...state,
//         ui: { ...state.ui, ...action.payload },
//       };
//     case "SET_ANALYSIS_DATA":
//       return {
//         ...state,
//         analysisData: action.payload,
//       };
//     case "SET_LOAD_TIMER":
//       return {
//         ...state,
//         loadTimer: action.payload,
//       };
//     default:
//       return state;
//   }
// };
