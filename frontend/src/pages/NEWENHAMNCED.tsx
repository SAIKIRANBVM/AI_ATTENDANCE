// import React, { useState, useEffect, useReducer, useCallback } from "react";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
// } from "@/components/ui/card";
// import {
//   Globe,
//   AlertCircle,
//   Download,
//   ChevronUp,
//   ChevronDown,
//   Users,
//   AlertTriangle,
//   CheckCircle2,
//   BarChart2,
//   ArrowUpCircle
// } from "lucide-react";
// import { useAuth } from "@/contexts/AuthContext";
// import axiosInstance, { setAuthToken } from "@/lib/axios";
// import alertsService from "@/services/alerts.service";



// interface DistrictOption {
//   value: string;
//   label: string;
// }

// interface SchoolOption {
//   value: string;
//   label: string;
//   district?: string;
//   location_id?: string;
//   key?: string;
// }

// interface GradeOption {
//   value: string;
//   label: string;
//   school?: string;
//   district?: string;
// }

// interface SummaryStatistics {
//   averageAttendanceRate: any;
//   totalStudents: number;
//   below85Students: number;
//   tier1Students: number;
//   tier2Students: number;
//   tier3Students: number;
//   tier4Students: number;
// }

// interface InsightItem {
//   text?: string;
//   insight?: string;
// }

// interface RecommendationItem {
//   text?: string;
//   recommendation?: string;
// }

// interface PrioritySchool {
//   schoolName: string;
//   district: string;
//   riskPercentage: number;
// }

// interface GradeRisk {
//   grade: string;
//   riskPercentage: number;
// }

// interface AnalysisData {
//   summaryStatistics: SummaryStatistics;
//   keyInsights: Array<string | InsightItem>;
//   recommendations: Array<string | RecommendationItem>;
// }

// interface ApiErrorResponse {
//   detail?: string;
// }

// interface ApiError {
//   response?: {
//     data?: ApiErrorResponse;
//     status?: number;
//     headers?: Record<string, any>;
//   };
//   request?: any;
//   message?: string;
// }

// interface SearchCriteria {
//   districtCode?: string;
//   gradeCode?: string;
//   schoolCode?: string;
// }

// interface DownloadCriteria extends SearchCriteria {
//   reportType?: string;
// }


// interface FilterState {
//   district: string;
//   school: string;
//   grade: string;
// }

// interface OptionsState {
//   districtOptions: DistrictOption[];
//   schoolOptions: SchoolOption[];
//   gradeOptions: GradeOption[];
//   allSchoolOptions: SchoolOption[];
// }

// interface LoadingState {
//   isLoading: boolean;
//   isInitialLoad: boolean;
//   isDownloadingReport: boolean;
// }

// interface ErrorState {
//   generalError: string | null;
//   downloadError: string | null;
// }

// interface UIState {
//   isGlobalView: boolean;
//   showFilters: boolean;
// }

// interface AppState {
//   filters: FilterState;
//   options: OptionsState;
//   loading: LoadingState;
//   errors: ErrorState;
//   ui: UIState;
//   analysisData: AnalysisData | null;
//   loadTimer: NodeJS.Timeout | null;
// }

// type AppAction =
//   | { type: "SET_FILTER"; payload: { field: keyof FilterState; value: string } }
//   | { type: "RESET_FILTERS" }
//   | { type: "SET_OPTIONS"; payload: Partial<OptionsState> }
//   | { type: "SET_LOADING"; payload: Partial<LoadingState> }
//   | { type: "SET_ERROR"; payload: Partial<ErrorState> }
//   | { type: "CLEAR_ERRORS" }
//   | { type: "SET_UI"; payload: Partial<UIState> }
//   | { type: "SET_ANALYSIS_DATA"; payload: AnalysisData | null }
//   | { type: "SET_LOAD_TIMER"; payload: NodeJS.Timeout | null };

// const initialState: AppState = {
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

// const appReducer = (state: AppState, action: AppAction): AppState => {
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



// const processDistrictCode = (code: string | undefined): string | undefined => {
//   if (!code) return undefined;
//   return /^D\d+$/.test(code) ? code.substring(1) : code;
// };


// const extractSchoolCode = (schoolValue: string): string => {
//   if (!schoolValue) return "";
//   return schoolValue.includes("-")
//     ? schoolValue.split("-").pop() || schoolValue
//     : schoolValue;
// };


// const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
//   districtCode: filters.district
//     ? processDistrictCode(filters.district)
//     : "",
//   gradeCode: filters.grade || "",
//   schoolCode: filters.school ? extractSchoolCode(filters.school) : "",
// });


// const extractErrorMessage = (error: ApiError): string => {
//   if (error.response) {
//     if (error.response.data?.detail) {
//       return error.response.data.detail;
//     }
//     if (error.response.status === 404) {
//       return "No data found for the selected filters.";
//     }
//     if (error.response.status === 503) {
//       return "Server is still initializing. Please try again in a moment.";
//     }
//   } else if (error.request) {
//     return "No response from server. Please check your connection.";
//   }
//   return `Request error: ${error.message}`;
// };


// const formatTextWithHighlights = (text: string): string => {
//   // First, handle the entire line by making the first part bold
//   // This will make everything before the first colon bold, if a colon exists
//   let formattedText = text.replace(/^([^:]+)(:)/, '<strong class="font-semibold text-gray-900">$1</strong>:');
  
//   // If no colon was found, try to make the first few words bold
//   if (formattedText === text) {
//     // This regex matches the first 2-5 words at the start of the string
//     formattedText = text.replace(/^(\w+(?:\s+\w+){0,4}\b)/, '<strong class="font-semibold text-gray-900">$1</strong>');
//   }
  
//   // Still highlight percentages in teal
//   formattedText = formattedText.replace(/(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?%)/g, '<strong class="text-teal-700">$1</strong>');
  
//   return formattedText;
// };

// const getTextFromItem = (
//   item: string | InsightItem | RecommendationItem
// ): string => {
//   if (typeof item === "string") return item;
//   if ("text" in item && item.text) return item.text;
//   if ("insight" in item && item.insight) return item.insight;
//   if ("recommendation" in item && item.recommendation)
//     return item.recommendation;
//   return "No content available";
// };

// const extractPrioritySchools = (recommendations: Array<string | RecommendationItem>): PrioritySchool[] => {
//   const schools: PrioritySchool[] = [];
//   const seen = new Set<string>(); 

//   recommendations.forEach(item => {
//     const text = getTextFromItem(item);
//     const match = text.match(/to\s+([^,]+?)\s+in\s+([^,]+?)\s+with\s+([\d.]+)%/i);
//     if (match) {
//       const [, schoolName, district, risk] = match;
//       const key = `${schoolName}-${district}`.toLowerCase();
//       if (!seen.has(key)) {
//         seen.add(key);
//         schools.push({
//           schoolName: schoolName.trim(),
//           district: district.trim(),
//           riskPercentage: parseFloat(risk)
//         });
//       }
//     }
//   });

//   return schools.sort((a, b) => b.riskPercentage - a.riskPercentage);
// };

// const extractGradeLevelRisks = (recommendations: Array<string | RecommendationItem>): GradeRisk[] => {
//   const grades: GradeRisk[] = [];
//   const seen = new Set<string>(); 

//   recommendations.forEach(item => {
//     const text = getTextFromItem(item);
//     const match = text.match(/Grade\s+(\d+)[^\d]+?([\d.]+)%/i);
//     if (match) {
//       const [, grade, risk] = match;
//       const gradeKey = `grade-${grade}`;
//       if (!seen.has(gradeKey)) {
//         seen.add(gradeKey);
//         grades.push({
//           grade: `Grade ${grade}`,
//           riskPercentage: parseFloat(risk)
//         });
//       }
//     }
//   });

//   return grades.sort((a, b) => {
//     const gradeA = parseInt(a.grade.replace('Grade ', ''));
//     const gradeB = parseInt(b.grade.replace('Grade ', ''));
//     return gradeA - gradeB;
//   });
// };

// const createOptionKey = (
//   prefix: string,
//   value: string,
//   index?: number,
//   additional?: string
// ): string => {
//   return `${prefix}-${additional || "none"}-${value}${
//     index !== undefined ? `-${index}` : ""
//   }`;
// };


// const AlertsDashboard: React.FC = () => {

//   const [state, dispatch] = useReducer(appReducer, initialState);
//   const { token, ready } = useAuth();
//   const authReady = ready && !!token;

//   useEffect(() => {
//     // if (!authReady) return; 
//     setAuthToken(token); 
//   }, [authReady, token]);

  
//   const fetchInitialData = useCallback(async (): Promise<void> => {
//     dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//     dispatch({ type: "CLEAR_ERRORS" });

//     if (state.loadTimer) {
//       clearTimeout(state.loadTimer);
//     }

//     try {
//       try {
//         console.log("Fetching filter options...");
//         const filterOptionsRes = await alertsService.getFilterOptions();
//         const { districts, schools, grades } = filterOptionsRes

//         const formattedDistricts: DistrictOption[] = Array.isArray(districts)
//           ? districts.map((d: any) => ({
//               ...d,
//               value: d.value.toString().replace(/^D/, ""),
//               label: d.label,
//             }))
//           : [];

//         dispatch({
//           type: "SET_OPTIONS",
//           payload: {
//             districtOptions: formattedDistricts,
//             allSchoolOptions: schools || [],
//           },
//         });

//         if (state.filters.district) {
//           const filteredSchools = (schools || []).filter(
//             (s: SchoolOption) => s.district === state.filters.district
//           );
//           dispatch({
//             type: "SET_OPTIONS",
//             payload: { schoolOptions: filteredSchools },
//           });

//           if (state.filters.school) {
//             const filteredGrades = (grades || []).filter(
//               (g: GradeOption) => g.school === state.filters.school
//             );
//             dispatch({
//               type: "SET_OPTIONS",
//               payload: { gradeOptions: filteredGrades },
//             });
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching filter options:", err);
//         dispatch({
//           type: "SET_ERROR",
//           payload: {
//             generalError: "Failed to load filter options. Please try again.",
//           },
//         });
//       }

//       try {
//         const searchCriteria = {
//           districtCode: "",
//           gradeCode: "",
//           schoolCode: ""
//         };

//         const analysisRes = await alertsService.getPredictionInsights(searchCriteria);
//         dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisRes });
//         dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
//         dispatch({ type: "SET_LOADING", payload: { isInitialLoad: false } });
//       } catch (analysisErr: any) {
//         console.error("Error fetching analysis:", analysisErr);
//         if (!analysisErr.message?.includes("starting up")) {
//           dispatch({
//             type: "SET_ERROR",
//             payload: {
//               generalError: "Failed to load initial data. Please try again.",
//             },
//           });
//         }
//       }
//     } catch (err) {
//       console.error("Error fetching initial data:", err);

//       const timer = setTimeout(() => {
//         fetchInitialData();
//       }, 3000);

//       dispatch({ type: "SET_LOAD_TIMER", payload: timer });
//     } finally {
//       dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
//     }
//   }, [state.loadTimer, state.filters.district, state.filters.school]);

  
//   const fetchSchoolsForDistrict = useCallback(
//     async (district: string): Promise<void> => {
//       if (!district) {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { 
//             schoolOptions: [],
//             gradeOptions: []
//           },
//         });
//         return;
//       }
  
//       try {
//         const filteredSchools = await alertsService.getSchoolsByDistrict({ 
//           district: district 
//         });
  
//         const schoolsWithKeys: SchoolOption[] = filteredSchools.map(
//           (school: any, index: number) => ({
//             ...school,
//             key: `school-${school.value}-${district}-${index}`,
//             location_id: school.location_id || school.value.split("-").pop(),
//             district: district,
//           })
//         );
  
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { 
//             schoolOptions: schoolsWithKeys,
//             gradeOptions: [] 
//           },
//         });
  
//         const currentSchoolValid = state.filters.school && 
//           schoolsWithKeys.some((s: SchoolOption) => s.value === state.filters.school);
  
//         if (state.filters.school && !currentSchoolValid) {
//           dispatch({
//             type: "SET_FILTER",
//             payload: { field: "school", value: "" },
//           });
//           dispatch({
//             type: "SET_FILTER",
//             payload: { field: "grade", value: "" },
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching schools for district:", error);
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { schoolOptions: [] },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "school", value: "" },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//       }
//     },
//     [state.filters.school]
//   );


// const fetchGradesForSchool = useCallback(
//   async (school: string, district: string): Promise<void> => {
//     if (!school || !district) {
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { gradeOptions: [] },
//       });
//       return;
//     }

//     try {
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: {
//           gradeOptions: [
//             {
//               value: "loading",
//               label: "Loading grades...",
//               school,
//               district,
//             },
//           ],
//         },
//       });

//       const schoolCode = extractSchoolCode(school);
      
//       console.log("Fetching grades for:", {
//         originalSchool: school,
//         extractedSchoolCode: schoolCode,
//         district: district
//       });

//       const gradesData = await alertsService.getGradesBySchool({ 
//         school: school,
//         district: district 
//       });

//       const formattedGrades: GradeOption[] = gradesData.map((g: any) => ({
//         value: g.value.toString(),
//         label: g.label || `Grade ${g.value}`,
//         school: school,
//         district: district,
//       }));

//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { gradeOptions: formattedGrades },
//       });

//       if (
//         state.filters.grade &&
//         !formattedGrades.some((g) => g.value === state.filters.grade)
//       ) {
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//       }
//     } catch (error) {
//       console.error("Error fetching grades:", error);
//       if (school === state.filters.school) {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { gradeOptions: [] },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//       }
//     }
//   },
//   [state.filters.grade, state.filters.school]
// );

// const fetchAnalysisData = useCallback(async (): Promise<
//   AnalysisData | undefined
// > => {
//   dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//   dispatch({ type: "CLEAR_ERRORS" });
//   dispatch({ type: "SET_UI", payload: { isGlobalView: false } });

//   try {
//     const searchCriteria: SearchCriteria = createSearchCriteria(state.filters)

//     console.log(
//       "Sending request to prediction-insights with data:",
//       JSON.stringify(searchCriteria, null, 2)
//     );

//     const analysisData = await alertsService.getPredictionInsights(searchCriteria);

//     console.log("Received response:", analysisData);

//     dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
//     dispatch({ type: "CLEAR_ERRORS" });
//     return analysisData;
//   } catch (err: any) {
//     console.error("Error fetching analysis:", err);
//     const errorMessage = err.message || "An unexpected error occurred";
//     dispatch({
//       type: "SET_ERROR",
//       payload: { generalError: errorMessage },
//     });
//     throw err;
//   } finally {
//     dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
//   }
// }, [state.filters]);

  
//   const resetFiltersAndFetchGlobal = useCallback(async (): Promise<void> => {
//     try {
//       dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//       dispatch({ type: "CLEAR_ERRORS" });
//       dispatch({ type: "RESET_FILTERS" });
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { gradeOptions: [] },
//       });
  
//       const searchCriteria = {
//         districtCode: "",
//         gradeCode: "",
//         schoolCode: "",
//       };
  
//       const [analysisData, schoolsData] = await Promise.all([
//         alertsService.getPredictionInsights(searchCriteria),
//         alertsService.getAllSchools(),
//       ]);
  
//       const uniqueSchools = schoolsData.reduce(
//         (acc: SchoolOption[], school: SchoolOption) => {
//           const uniqueKey = `school-${school.district || "none"}-${
//             school.value
//           }`;
//           if (!acc.some((s) => s.key === uniqueKey)) {
//             acc.push({ ...school, key: uniqueKey });
//           }
//           return acc;
//         },
//         []
//       );
  
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { schoolOptions: uniqueSchools },
//       });
//       dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
//       dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
//     } catch (err) {
//       console.error("Error resetting analysis:", err);
//       dispatch({
//         type: "SET_ERROR",
//         payload: { generalError: "Failed to reset data. Please try again." },
//       });
//     } finally {
//       dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
//     }
//   }, []);
  

//   const downloadReport = useCallback(
//     async (reportType: string): Promise<void> => {
//       try {
//         dispatch({
//           type: "SET_LOADING",
//           payload: { isDownloadingReport: true },
//         });
//         dispatch({ type: "SET_ERROR", payload: { downloadError: null } });
  
//         const downloadCriteria: DownloadCriteria = {
//           ...createSearchCriteria(state.filters),
//           reportType: reportType,
//         };
  
//         console.log("Download criteria:", downloadCriteria);
  
//         const blob = await alertsService.downloadReport(reportType, downloadCriteria);
  
//         const filename = alertsService.generateReportFilename(reportType);
//         alertsService.triggerDownload(blob, filename);
//       } catch (err: any) {
//         console.error("Error in downloadReport:", err);
//         const errorMessage = err.message || "An unexpected error occurred";
//         dispatch({
//           type: "SET_ERROR",
//           payload: {
//             downloadError: `Error downloading report: ${errorMessage}`,
//           },
//         });
//       } finally {
//         dispatch({
//           type: "SET_LOADING",
//           payload: { isDownloadingReport: false },
//         });
//       }
//     },
//     [state.filters]
//   );

  

//   const handleFilterChange = useCallback(
//     (field: keyof FilterState, value: string) => {
//       if (field === 'district' && value !== state.filters.district) {
//         dispatch({ type: "SET_FILTER", payload: { field: "district", value } });
//         dispatch({ type: "SET_FILTER", payload: { field: "school", value: "" } });
//         dispatch({ type: "SET_FILTER", payload: { field: "grade", value: "" } });
//       } else {
//         dispatch({ type: "SET_FILTER", payload: { field, value } });
//       }
//     },
//     [state.filters.district]
//   );

//   const handleToggleFilters = useCallback(() => {
//     dispatch({
//       type: "SET_UI",
//       payload: { showFilters: !state.ui.showFilters },
//     });
//   }, [state.ui.showFilters]);




//   useEffect(() => {
//     if (!authReady) return; 
//     fetchInitialData();

//     return () => {
//       if (state.loadTimer) {
//         clearTimeout(state.loadTimer);
//       }
//     };
//   }, [authReady, state.loadTimer]);

//   useEffect(() => {
//     fetchSchoolsForDistrict(state.filters.district);
//   }, [state.filters.district, fetchSchoolsForDistrict]);

//   useEffect(() => {
//     if (state.filters.school) {
//       fetchGradesForSchool(state.filters.school, state.filters.district);
//     } else {
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { gradeOptions: [] },
//       });
//       dispatch({
//         type: "SET_FILTER",
//         payload: { field: "grade", value: "" },
//       });
//     }
//   }, [state.filters.school, state.filters.district, fetchGradesForSchool]);

  
//   const LoadingSkeletonCards: React.FC = () => (
//     <>
//       {[1, 2, 3, 4, 5].map((i) => (
//         <Card key={i} className="animate-pulse h-32">
//           <CardHeader className="pb-2">
//             <div className="h-5 bg-gray-200 rounded w-24"></div>
//           </CardHeader>
//           <CardContent>
//             <div className="h-8 bg-gray-200 rounded w-16"></div>
//           </CardContent>
//         </Card>
//       ))}
//     </>
//   );

 
//   const ReportDownloadingModal: React.FC = () => (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white p-4 rounded-lg shadow-lg">
//         <div className="flex items-center space-x-2">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//           <span>Preparing your report...</span>
//         </div>
//       </div>
//     </div>
//   );


  
//   const FilterSection: React.FC = () => (
//     <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
//       <div className="mb-4">
//         <label
//           className="block text-sm font-medium mb-1"
//           htmlFor="district-select"
//         >
//           District
//         </label>
//         <select
//           id="district-select"
//           value={state.filters.district}
//           onChange={(e) => handleFilterChange("district", e.target.value)}
//           className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//           disabled={state.loading.isInitialLoad}
//           aria-label="Select district"
//         >
//           <option value="">Select District</option>
//           {state.options.districtOptions.map((d, index) => (
//             <option
//               key={createOptionKey("district", d.value, index)}
//               value={d.value}
//             >
//               {d.label}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="mb-4">
//         <label
//           className="block text-sm font-medium mb-1"
//           htmlFor="school-select"
//         >
//           School
//         </label>
//         <select
//           id="school-select"
//           value={state.filters.school}
//           onChange={(e) => handleFilterChange("school", e.target.value)}
//           className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px] disabled:opacity-50 disabled:cursor-not-allowed"
//           disabled={!state.filters.district || !state.options.schoolOptions.length ||state.loading.isInitialLoad}
//           aria-label="Select school"
//         >
//           <option value="">Select School</option>
//           {state.options.schoolOptions.map((s, index) => (
//             <option
//               key={createOptionKey("school", s.value, index, s.district)}
//               value={s.value}
//             >
//               {s.label}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="mb-4">
//         <label
//           className="block text-sm font-medium mb-1"
//           htmlFor="grade-select"
//         >
//           Grade
//         </label>
//         <select
//           id="grade-select"
//           value={state.filters.grade}
//           onChange={(e) => handleFilterChange("grade", e.target.value)}
//           className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px] disabled:opacity-50 disabled:cursor-not-allowed"
//           disabled={!state.options.gradeOptions.length || state.loading.isLoading}
//           aria-label="Select grade"
//         >
//           <option value="">Select Grade</option>
//           {state.options.gradeOptions.map((g, index) => (
//             <option
//               key={createOptionKey("grade", g.value, index, g.school)}
//               value={g.value}
//             >
//               {g.label}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="flex gap-2">
//         <button
//           onClick={fetchAnalysisData}
//           className={`bg-[#03787c] text-white px-3 py-2 rounded text-sm hover:bg-[#026266] w-full ${
//             state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//           disabled={state.loading.isInitialLoad}
//           aria-label="Search for analysis data"
//         >
//           Search
//         </button>
//         <button
//           onClick={resetFiltersAndFetchGlobal}
//           className={`bg-white text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-50 w-full border border-[#E9E9E9] shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] ${
//             state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//           disabled={state.loading.isInitialLoad}
//           aria-label="Reset all filters"
//         >
//           Reset
//         </button>
//       </div>

//       <div className="mt-6 border-t pt-4">
//         <h3 className="text-sm font-medium mb-3">Download Reports</h3>
//         <div className="space-y-2">
//           <button
//             onClick={() => downloadReport("summary")}
//             className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//             aria-label="Download summary report"
//           >
//             <Download size={16} />
//             Summary Report
//           </button>
//           <button
//             onClick={() => downloadReport("detailed")}
//             className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//             aria-label="Download detailed report"
//           >
//             <Download size={16} />
//             Detailed Report
//           </button>
//           <button
//             onClick={() => downloadReport("below_85")}
//             className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//             aria-label="Download below 85% attendance report"
//           >
//             <Download size={16} />
//             Below 85% Report
//           </button>
//         </div>
//       </div>
//     </div>
//   );

 
//   /**
//    * Summary statistics cards
//    */
//   const SummaryCards: React.FC = () => {
//     if (!state.analysisData) return null;
//     const cardConfigs = [
//       {
//         title: "Total Students",
//         value: state.analysisData.summaryStatistics.totalStudents,
//         reportType: "summary",
//         icon: <Users className="h-5 w-5 text-blue-600" />,
//         bgColor: "from-blue-50 to-blue-100",
//         borderColor: "border-blue-200",
//         textColor: "text-blue-800"
//       },
//       {
//         title: "Tier 1 (≥95%)",
//         value: state.analysisData.summaryStatistics.tier1Students || 0,
//         reportType: "tier1",
//         icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
//         bgColor: "from-green-50 to-green-100",
//         borderColor: "border-green-200",
//         textColor: "text-green-800"
//       },
//       {
//         title: "Tier 2 (90-95%)",
//         value: state.analysisData.summaryStatistics.tier2Students || 0,
//         reportType: "tier2",
//         icon: <ArrowUpCircle className="h-5 w-5 text-blue-600" />,
//         bgColor: "from-blue-50 to-blue-100",
//         borderColor: "border-blue-200",
//         textColor: "text-blue-800"
//       },
//       {
//         title: "Tier 3 (80-90%)",
//         value: state.analysisData.summaryStatistics.tier3Students || 0,
//         reportType: "tier3",
//         icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
//         bgColor: "from-amber-50 to-amber-100",
//         borderColor: "border-amber-200",
//         textColor: "text-amber-800"
//       },
//       {
//         title: "Tier 4 (<80%)",
//         value: state.analysisData.summaryStatistics.tier4Students || 0,
//         reportType: "tier4",
//         icon: <AlertCircle className="h-5 w-5 text-red-600" />,
//         bgColor: "from-red-50 to-red-100",
//         borderColor: "border-red-200",
//         textColor: "text-red-800"
//       },

//     ];

//     return (
//       <div className="w-full overflow-hidden">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-1 pb-1 -mx-1">
//           {cardConfigs.map((config, index) => (
//             <Card 
//               key={index} 
//               className={`
//                 group relative overflow-hidden 
//                 border ${config.borderColor} 
//                 bg-gradient-to-br ${config.bgColor}
//                 hover:shadow-lg hover:-translate-y-0.5
//                 transition-all duration-200 ease-in-out
//                 h-full flex flex-col
//               `}
//             >
//               <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors duration-300"></div>
//               <CardHeader className="p-4 pb-2 relative z-10">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className={`text-sm font-medium ${config.textColor} tracking-tight`}>
//                     {config.title}
//                   </CardTitle>
//                   <div className={`p-1.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform duration-200`}>
//                     {config.icon}
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="p-4 pt-0 relative z-10 mt-auto">
//                 <div className="flex items-end justify-between">
//                   <div className="text-2xl font-bold tracking-tight">
//                     {typeof config.value === 'number' 
//                       ? config.value.toLocaleString() 
//                       : config.value}
//                   </div>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       downloadReport(config.reportType);
//                     }}
//                     className={`
//                       p-1.5 rounded-md 
//                       text-gray-400 hover:text-gray-700 
//                       hover:bg-white/50 
//                       transition-all duration-200
//                       backdrop-blur-sm
//                       group-hover:opacity-100 opacity-70
//                     `}
//                     title={`Download ${config.title} Report`}
//                   >
//                     <Download className="h-3.5 w-3.5" />
//                   </button>
//                 </div>
//                 {config.title.includes("Avg") && (
//                   <div className="mt-1.5 h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
//                     <div 
//                       className={`h-full ${config.bgColor.replace('to-', 'bg-').split(' ')[0]} rounded-full`}
//                       style={{ width: `${state.analysisData?.summaryStatistics.averageAttendanceRate}%` }}
//                     ></div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       </div>
//     );
//   };

//   const InsightsAndRecommendations: React.FC = () => {
//     if (!state.analysisData) return null;

//     const InsightPanel: React.FC<{
//       title: string;
//       icon: string;
//       items: Array<string | InsightItem | RecommendationItem>;
//       emptyMessage: string;
//       tooltip?: string;
//     }> = ({ title, icon, items, emptyMessage, tooltip }) => (
//       <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
//         <div className="bg-[#03787c] text-white px-4 h-11 flex items-center justify-between rounded-t-lg">
//           <div className="flex items-center">
//             <span className="text-sm mr-2" role="img" aria-label={title}>
//               {icon}
//             </span>
//             <h3 className="font-semibold text-sm">{title}</h3>
//           </div>
//           {tooltip && (
//             <div className="group relative">
//               <svg 
//                 className="w-4 h-4 text-white/80 hover:text-white cursor-help" 
//                 fill="currentColor" 
//                 viewBox="0 0 20 20" 
//                 xmlns="http://www.w3.org/2000/svg"
//                 aria-label="More information"
//               >
//                 <path 
//                   fillRule="evenodd" 
//                   d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
//                   clipRule="evenodd"
//                 />
//               </svg>
//               <div className="absolute right-0 mt-2 w-64 p-2 text-xs text-gray-700 bg-white rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
//                 {tooltip}
//               </div>
//             </div>
//           )}
//         </div>
//         <div className="overflow-y-auto max-h-[360px] p-3 bg-white rounded-b-lg text-xs">
//           {items?.length > 0 ? (
//             <ul className="space-y-3" role="list">
//               {items.map((item, index) => {
//                 const text = getTextFromItem(item);
//                 const formattedText = formatTextWithHighlights(text);

//                 return (
//                   <li
//                     key={index}
//                     className="text-gray-800 text-sm leading-relaxed"
//                     role="listitem"
//                   >
//                     <div className="flex items-start">
//                       <span
//                         className="text-teal-600 mr-2 mt-1"
//                         aria-hidden="true"
//                       >
//                         •
//                       </span>
//                       <span
//                         dangerouslySetInnerHTML={{ __html: formattedText }}
//                       />
//                     </div>
//                   </li>
//                 );
//               })}
//             </ul>
//           ) : (
//             <p className="text-gray-500 text-sm">{emptyMessage}</p>
//           )}
//         </div>
//       </div>
//     );

//     return (
//       <div className="w-full flex flex-col gap-5 mt-4">
//         <InsightPanel
//           title="AI Driven Key Insights"
//           icon="ℹ️"
//           items={state.analysisData.keyInsights}
//           emptyMessage="No insights available"
//           icon={""}        />
//         <InsightPanel
//           title="AI Recommendations"
//           icon="✅"
//           items={state.analysisData.recommendations}
//           emptyMessage="No recommendations available"
//         />
        
//         {/* New Tables Section */}

//       </div>
//     );
//   };

  
//   const StatusNotifications: React.FC = () => (
//     <>
//       {state.errors.generalError && (
//         <div className="w-full">
//           <div
//             className="bg-yellow-50 border-l-4 border-yellow-500 p-3"
//             role="alert"
//           >
//             <div className="flex">
//               <div className="flex-shrink-0">
//                 <svg
//                   className="animate-spin h-5 w-5 text-yellow-500"
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   aria-hidden="true"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   ></circle>
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                   ></path>
//                 </svg>
//               </div>
//               <div className="ml-3">
//                 <p className="text-sm text-yellow-700">
//                   {state.errors.generalError}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {state.ui.isGlobalView && state.analysisData && (
//         <div className="w-full">
//           <div
//             className="bg-blue-50 border-l-4 border-blue-500 p-3"
//             role="status"
//           >
//             <div className="flex">
//               <div className="flex-shrink-0">
//                 <Globe className="h-5 w-5 text-blue-500" aria-hidden="true" />
//               </div>
//               <div className="ml-3">
//                 <p className="text-sm text-blue-700">
//                   Viewing Global Analysis - Showing data for all districts,
//                   schools, and grades
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {(state.loading.isLoading || state.loading.isInitialLoad) &&
//         !state.errors.generalError && (
//           <div className="w-full">
//             <div className="flex justify-center items-center w-full mb-2">
//               <div className="flex items-center justify-center gap-2">
//                 <svg
//                   className="animate-spin h-5 w-5 text-blue-500"
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   aria-hidden="true"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   ></circle>
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                   ></path>
//                 </svg>
//                 <p className="text-blue-700 text-sm">
//                   Loading dashboard data...
//                 </p>
//               </div>
//             </div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
//               <LoadingSkeletonCards />
//             </div>
//           </div>
//         )}
//     </>
//   );

 
//   return (
//     <div className="min-h-screen bg-gray-50/50 relative">
//       {state.loading.isDownloadingReport && <ReportDownloadingModal />}

//       <div className="container mx-auto p-4 md:p-6 max-w-7xl">
//         {/* Header Section */}
//         <div className="mb-4">
//           <div className="flex justify-between items-center flex-wrap gap-2">
//             <div>
//               <div className="flex items-center gap-2">
//                 <h1 className="text-2xl font-bold">AI-Driven Attendance Insights & Recommendations</h1>
//                 <div className="group relative">
//                   <svg
//                     className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                     aria-label="More information"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                     />
//                   </svg>
//                 </div>
//               </div>
//               <p className="text-sm text-muted-foreground">
//                    Generated by advanced AI models to highlight risks, trends, and next steps for improving attendance outcomes
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handleToggleFilters}
//                 className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
//                 aria-label={
//                   state.ui.showFilters ? "Hide filters" : "Show filters"
//                 }
//               >
//                 {state.ui.showFilters ? "Hide Filters" : "Show Filters"}
//                 {state.ui.showFilters ? (
//                   <ChevronUp size={16} />
//                 ) : (
//                   <ChevronDown size={16} />
//                 )}
//               </button>
//             </div>
//           </div>
//           <div className="w-full h-0.5 bg-gray-200 mt-2"></div>
//         </div>

//         <div className="flex w-full min-h-screen flex-col lg:flex-row gap-4">
//           {/* Filter Section */}
//           {state.ui.showFilters && <FilterSection />}

//           {/* Main Dashboard */}
//           <div className="flex-1 overflow-x-auto">
//             <div className="flex flex-col gap-4">
//               {/* Status Notifications */}
//               <StatusNotifications />

//               {/* Dashboard Content */}
//               {!state.loading.isLoading &&
//                 !state.loading.isInitialLoad &&
//                 state.analysisData && (
//                   <>
//                     <SummaryCards />
//                     <InsightsAndRecommendations />
//                   </>
//                 )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AlertsDashboard;