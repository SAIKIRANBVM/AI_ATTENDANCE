

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
// } from "lucide-react";
// // import { useAuth } from "../../../alerts/contexts/AuthContext";
// // import axiosInstance, { setAuthToken } from "../../../alerts/lib/axios";
// import { setAuthToken } from "@/lib/axios";
// import {useAuth} from "@/contexts/AuthContext";
// import alertsService, { 
//   AnalysisData, 
//   SearchCriteria, 
//   DownloadCriteria 
// } from "@/services/alerts.service";



// interface FilterState {
//   district: string;
//   school: string;
//   grade: string;
// }

// // interface OptionsState {
// //   districtOptions: DistrictOption[];
// //   schoolOptions: SchoolOption[];
// //   gradeOptions: GradeOption[];
// //   allSchoolOptions: SchoolOption[];
// // }

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

// // ============================================================================
// // UTILITY FUNCTIONS
// // ============================================================================

// /**
//  * Processes district code by removing 'D' prefix if present
//  */
// const processDistrictCode = (code: string | undefined): string | undefined => {
//   if (!code) return undefined;
//   return /^D\d+$/.test(code) ? code.substring(1) : code;
// };

// /**
//  * Extracts school code from combined district-school ID
//  */
// const extractSchoolCode = (schoolValue: string): string => {
//   if (!schoolValue) return "";
//   return schoolValue.includes("-")
//     ? schoolValue.split("-").pop() || schoolValue
//     : schoolValue;
// };

// /**
//  * Creates search criteria object from current filter state
//  */
// const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
//   district_code: filters.district
//     ? processDistrictCode(filters.district)
//     : undefined,
//   grade_code: filters.grade || undefined,
//   school_code: filters.school ? extractSchoolCode(filters.school) : undefined,
//   student_id: undefined,
// });

// /**
//  * Extracts user-friendly error message from API error
//  */
// // const extractErrorMessage = (error: ApiError): string => {
// //   if (error.response) {
// //     if (error.response.data?.detail) {
// //       return error.response.data.detail;
// //     }
// //     if (error.response.status === 404) {
// //       return "No data found for the selected filters.";
// //     }
// //     if (error.response.status === 503) {
// //       return "Server is still initializing. Please try again in a moment.";
// //     }
// //   } else if (error.request) {
// //     return "No response from server. Please check your connection.";
// //   }
// //   return `Request error: ${error.message}`;
// // };

// /**
//  * Formats insight/recommendation text with highlighted percentages
//  */
// const formatTextWithHighlights = (text: string): string => {
//   return text.replace(/(\d+%)/g, '<strong class="text-teal-700">$1</strong>');
// };

// /**
//  * Safely extracts text from insight/recommendation items
//  */
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

// /**
//  * Creates unique key for select options
//  */
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

// // ============================================================================
// // MAIN COMPONENT
// // ============================================================================

// const AlertsDashboard: React.FC = () => {
//   // ============================================================================
//   // STATE MANAGEMENT
//   // ============================================================================

//   const [state, dispatch] = useReducer(appReducer, initialState);
//   const { token } = useAuth();

//   // ============================================================================
//   // DATA FETCHING FUNCTIONS
//   // ============================================================================

//   /**
//    * Fetches initial filter options and global analysis data
//    */
//   const fetchInitialData = useCallback(async (): Promise<void> => {
//     dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//     dispatch({ type: "CLEAR_ERRORS" });
  
//     if (state.loadTimer) {
//       clearTimeout(state.loadTimer);
//     }
  
//     try {
//       // Fetch filter options
//       try {
//         console.log("Fetching filter options...");
//         const filterOptionsData = await alertsService.getFilterOptions();
//         const { districts, schools, grades } = filterOptionsData;
  
//         const formattedDistricts = Array.isArray(districts)
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
  
//         // Set filtered options if filters are already selected
//         if (state.filters.district) {
//           const filteredSchools = (schools || []).filter(
//             (s) => s.district === state.filters.district
//           );
//           dispatch({
//             type: "SET_OPTIONS",
//             payload: { schoolOptions: filteredSchools },
//           });
  
//           if (state.filters.school) {
//             const filteredGrades = (grades || []).filter(
//               (g) => g.school === state.filters.school
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
  
//       // Fetch initial global analysis
//       try {
//         const searchCriteria: SearchCriteria = {
//           district_code: undefined,
//           grade_code: undefined,
//           school_code: undefined,
//           student_id: undefined,
//         };
  
//         const analysisData = await alertsService.getPredictionInsights(searchCriteria);
//         dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
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

//   /**
//    * Fetches schools for selected district
//    */
//   const fetchSchoolsForDistrict = useCallback(
//     async (district: string): Promise<void> => {
//       if (!district) {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { schoolOptions: [] },
//         });
//         return;
//       }
  
//       try {
//         const schools = await alertsService.getSchoolsByDistrict({ district });
  
//         const filteredSchools = schools.map((school) => ({
//           ...school,
//           key: `school-${school.value}`,
//           location_id: school.location_id || school.value.split("-").pop(),
//         }));
  
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { schoolOptions: filteredSchools },
//         });
  
//         // Reset school if no longer valid
//         const currentSchoolValid =
//           state.filters.school &&
//           filteredSchools.some((s) => s.value === state.filters.school);
  
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

//   /**
//    * Fetches grades for selected school
//    */
//   const fetchGradesForSchool = useCallback(
//     async (school: string, district: string): Promise<void> => {
//       if (!school) {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { gradeOptions: [] },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//         return;
//       }
  
//       const selectedSchool = state.options.schoolOptions.find(
//         (s) => s.value === school
//       );
//       if (!selectedSchool) {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { gradeOptions: [] },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//         return;
//       }
  
//       try {
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: {
//             gradeOptions: [
//               {
//                 value: "loading",
//                 label: "Loading grades...",
//                 school,
//                 district,
//               },
//             ],
//           },
//         });
  
//         const schoolParts = school.split("-");
//         const schoolId =
//           schoolParts.length > 1 ? school : `${district || ""}-${school}`;
  
//         const grades = await alertsService.getGradesBySchool({
//           school: schoolId,
//           district: district || "",
//         });
  
//         const formattedGrades = grades.map((g) => ({
//           value: g.value.toString(),
//           label: g.label,
//           school,
//           district: district || "",
//         }));
  
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { gradeOptions: formattedGrades },
//         });
  
//         // Reset grade if no longer valid
//         if (
//           state.filters.grade &&
//           !formattedGrades.some((g) => g.value === state.filters.grade)
//         ) {
//           dispatch({
//             type: "SET_FILTER",
//             payload: { field: "grade", value: "" },
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching grades:", error);
//         dispatch({
//           type: "SET_OPTIONS",
//           payload: { gradeOptions: [] },
//         });
//         dispatch({
//           type: "SET_FILTER",
//           payload: { field: "grade", value: "" },
//         });
//       }
//     },
//     [state.options.schoolOptions, state.filters.grade]
//   );
//   /**
//    * Fetches analysis data based on current filters
//    */
//   const fetchAnalysisData = useCallback(async (): Promise<AnalysisData | undefined> => {
//     dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//     dispatch({ type: "CLEAR_ERRORS" });
//     dispatch({ type: "SET_UI", payload: { isGlobalView: false } });
  
//     try {
//       const searchCriteria = createSearchCriteria(state.filters);
  
//       console.log(
//         "Sending request to prediction-insights with data:",
//         JSON.stringify(searchCriteria, null, 2)
//       );
  
//       const analysisData = await alertsService.getPredictionInsights(searchCriteria);
  
//       console.log("Received response:", analysisData);
  
//       dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
//       dispatch({ type: "CLEAR_ERRORS" });
//       return analysisData;
//     } catch (err: any) {
//       console.error("Error fetching analysis:", err);
//       dispatch({
//         type: "SET_ERROR",
//         payload: { generalError: err.message },
//       });
//       throw err;
//     } finally {
//       dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
//     }
//   }, [state.filters]);
//   /**
//    * Resets all filters and fetches global data
//    */
//   const resetFiltersAndFetchGlobal = useCallback(async (): Promise<void> => {
//     try {
//       dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
//       dispatch({ type: "CLEAR_ERRORS" });
//       dispatch({ type: "RESET_FILTERS" });
//       dispatch({
//         type: "SET_OPTIONS",
//         payload: { gradeOptions: [] },
//       });
  
//       const searchCriteria: SearchCriteria = {
//         district_code: undefined,
//         grade_code: undefined,
//         school_code: undefined,
//       };
  
//       const [analysisData, schools] = await Promise.all([
//         alertsService.getPredictionInsights(searchCriteria),
//         alertsService.getAllSchools(),
//       ]);
  
//       const uniqueSchools = schools.reduce((acc: any[], school: any) => {
//         const uniqueKey = `school-${school.district || "none"}-${school.value}`;
//         if (!acc.some((s) => s.key === uniqueKey)) {
//           acc.push({ ...school, key: uniqueKey });
//         }
//         return acc;
//       }, []);
  
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
//   /**
//    * Downloads a report of specified type
//    */
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
//           report_type: reportType,
//         };
  
//         console.log("Download criteria:", downloadCriteria);
  
//         const blob = await alertsService.downloadReport(reportType, downloadCriteria);
//         const filename = alertsService.generateReportFilename(reportType);
//         alertsService.triggerDownload(blob, filename);
//       } catch (err: any) {
//         console.error("Error in downloadReport:", err);
//         dispatch({
//           type: "SET_ERROR",
//           payload: {
//             downloadError: `Error downloading report: ${err.message}`,
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
//   // ============================================================================
//   // EVENT HANDLERS
//   // ============================================================================

//   const handleFilterChange = useCallback(
//     (field: keyof FilterState, value: string) => {
//       dispatch({ type: "SET_FILTER", payload: { field, value } });
//     },
//     []
//   );

//   const handleToggleFilters = useCallback(() => {
//     dispatch({
//       type: "SET_UI",
//       payload: { showFilters: !state.ui.showFilters },
//     });
//   }, [state.ui.showFilters]);

//   // ============================================================================
//   // EFFECTS
//   // ============================================================================

//   // Set auth token when it changes
//   useEffect(() => {
//     if (token) {
//       setAuthToken(token);
//     }
//   }, [token]);

//   // Fetch initial data on mount
//   useEffect(() => {
//     fetchInitialData();

//     return () => {
//       if (state.loadTimer) {
//         clearTimeout(state.loadTimer);
//       }
//     };
//   }, []);

//   // Fetch schools when district changes
//   useEffect(() => {
//     fetchSchoolsForDistrict(state.filters.district);
//   }, [state.filters.district, fetchSchoolsForDistrict]);

//   // Fetch grades when school changes
//   useEffect(() => {
//     fetchGradesForSchool(state.filters.school, state.filters.district);
//   }, [state.filters.school, state.filters.district, fetchGradesForSchool]);

//   // ============================================================================
//   // RENDER HELPER COMPONENTS
//   // ============================================================================

//   /**
//    * Loading skeleton for summary cards
//    */
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

//   /**
//    * Report downloading modal overlay
//    */
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

//   /**
//    * Filter section component
//    */
//   const FilterSection: React.FC = () => (
//     <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
//       {/* District Filter */}
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

//       {/* School Filter */}
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
//           className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//           disabled={
//             !state.options.schoolOptions.length || state.loading.isInitialLoad
//           }
//           aria-label="Select school"
//         >
//           <option value="">Select School</option>
//           {state.options.schoolOptions.map((s) => (
//             <option
//               key={createOptionKey("school", s.value, undefined, s.district)}
//               value={s.value}
//             >
//               {s.label}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Grade Filter */}
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
//           className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//           disabled={
//             !state.options.gradeOptions.length || state.loading.isInitialLoad
//           }
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

//       {/* Action Buttons */}
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

//       {/* Download Reports Section */}
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
//         value: state.analysisData.summary_statistics.total_students,
//         reportType: "summary",
//         icon: null,
//       },
//       {
//         title: "Below 85% Attendance",
//         value: state.analysisData.summary_statistics.below_85_students,
//         reportType: "below_85",
//         icon: <AlertCircle size={14} className="text-[#03787c]" />,
//       },
//       {
//         title: "Tier 1 Students (≥95%)",
//         value: state.analysisData.summary_statistics.tier1_students,
//         reportType: "tier1",
//         icon: null,
//       },
//       {
//         title: "Tier 4 Students (<80%)",
//         value: state.analysisData.summary_statistics.tier4_students,
//         reportType: "tier4",
//         icon: null,
//       },
//     ];

//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         {cardConfigs.map((config, index) => (
//           <Card key={index} className="bg-white border border-[#C0D5DE]">
//             <CardHeader className="pb-1 pt-3">
//               <CardTitle className="text-base flex items-center gap-1">
//                 {config.icon}
//                 {config.title}
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="pb-3 pt-1 flex justify-between items-center">
//               <span className="text-2xl font-semibold">{config.value}</span>
//               <button
//                 onClick={() => downloadReport(config.reportType)}
//                 className="text-xs bg-[#03787c] text-white p-1 rounded flex items-center gap-1 hover:bg-[#026266]"
//                 title={`Download ${config.title} Report`}
//                 aria-label={`Download ${config.title} report`}
//               >
//                 <Download size={12} />
//                 Export
//               </button>
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     );
//   };

//   /**
//    * AI Insights and Recommendations panels
//    */
//   const InsightsAndRecommendations: React.FC = () => {
//     if (!state.analysisData) return null;

//     const InsightPanel: React.FC<{
//       title: string;
//       icon: string;
//       items: Array<string | InsightItem | RecommendationItem>;
//       emptyMessage: string;
//     }> = ({ title, icon, items, emptyMessage }) => (
//       <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
//         <div className="bg-[#03787c] text-white px-4 h-11 flex items-center rounded-t-lg">
//           <span className="text-sm mr-2" role="img" aria-label={title}>
//             {icon}
//           </span>
//           <h3 className="font-semibold text-sm">{title}</h3>
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
//       <div className="w-full flex flex-col md:flex-row gap-5 mt-4">
//         <InsightPanel
//           title="AI DRIVEN Key Insights"
//           icon="ℹ️"
//           items={state.analysisData.key_insights}
//           emptyMessage="No insights available"
//         />
//         <InsightPanel
//           title="AI Recommendations"
//           icon="✅"
//           items={state.analysisData.recommendations}
//           emptyMessage="No recommendations available"
//         />
//       </div>
//     );
//   };

//   /**
//    * Status notifications (error, global view, loading)
//    */
//   const StatusNotifications: React.FC = () => (
//     <>
//       {/* Error Notification */}
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

//       {/* Global View Notification */}
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

//       {/* Loading Notification */}
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

//   // ============================================================================
//   // MAIN RENDER
//   // ============================================================================

//   return (
//     <div className="min-h-screen bg-gray-50/50 relative">
//       {/* Download Progress Modal */}
//       {state.loading.isDownloadingReport && <ReportDownloadingModal />}

//       <div className="container mx-auto px-4 py-4 max-w-full">
//         {/* Header Section */}
//         <div className="mb-4">
//           <div className="flex justify-between items-center flex-wrap gap-2">
//             <div>
//               <h1 className="text-2xl font-bold">Alerts Dashboard</h1>
//               <p className="text-sm text-muted-foreground">
//                 Monitor alerts and notifications
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



import React, { useState, useEffect, useReducer, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Globe,
  AlertCircle,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance, { setAuthToken } from "@/lib/axios";
import alertsService from "@/services/alerts.service";


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DistrictOption {
  value: string;
  label: string;
}

interface SchoolOption {
  value: string;
  label: string;
  district?: string;
  location_id?: string;
  key?: string;
}

interface GradeOption {
  value: string;
  label: string;
  school?: string;
  district?: string;
}

interface SummaryStatistics {
  total_students: number;
  below_85_students: number;
  tier1_students: number;
  tier4_students: number;
}

interface InsightItem {
  text?: string;
  insight?: string;
}

interface RecommendationItem {
  text?: string;
  recommendation?: string;
}

interface AnalysisData {
  summary_statistics: SummaryStatistics;
  key_insights: Array<string | InsightItem>;
  recommendations: Array<string | RecommendationItem>;
}

interface ApiErrorResponse {
  detail?: string;
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    headers?: Record<string, any>;
  };
  request?: any;
  message?: string;
}

interface SearchCriteria {
  district_code?: string;
  grade_code?: string;
  school_code?: string;
  student_id?: string;
}

interface DownloadCriteria extends SearchCriteria {
  report_type?: string;
}

// ============================================================================
// STATE MANAGEMENT WITH USEREDUCER
// ============================================================================

interface FilterState {
  district: string;
  school: string;
  grade: string;
}

interface OptionsState {
  districtOptions: DistrictOption[];
  schoolOptions: SchoolOption[];
  gradeOptions: GradeOption[];
  allSchoolOptions: SchoolOption[];
}

interface LoadingState {
  isLoading: boolean;
  isInitialLoad: boolean;
  isDownloadingReport: boolean;
}

interface ErrorState {
  generalError: string | null;
  downloadError: string | null;
}

interface UIState {
  isGlobalView: boolean;
  showFilters: boolean;
}

interface AppState {
  filters: FilterState;
  options: OptionsState;
  loading: LoadingState;
  errors: ErrorState;
  ui: UIState;
  analysisData: AnalysisData | null;
  loadTimer: NodeJS.Timeout | null;
}

type AppAction =
  | { type: "SET_FILTER"; payload: { field: keyof FilterState; value: string } }
  | { type: "RESET_FILTERS" }
  | { type: "SET_OPTIONS"; payload: Partial<OptionsState> }
  | { type: "SET_LOADING"; payload: Partial<LoadingState> }
  | { type: "SET_ERROR"; payload: Partial<ErrorState> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_UI"; payload: Partial<UIState> }
  | { type: "SET_ANALYSIS_DATA"; payload: AnalysisData | null }
  | { type: "SET_LOAD_TIMER"; payload: NodeJS.Timeout | null };

const initialState: AppState = {
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
  },
  errors: {
    generalError: null,
    downloadError: null,
  },
  ui: {
    isGlobalView: false,
    showFilters: true,
  },
  analysisData: null,
  loadTimer: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.field]: action.payload.value,
        },
      };
    case "RESET_FILTERS":
      return {
        ...state,
        filters: { district: "", school: "", grade: "" },
      };
    case "SET_OPTIONS":
      return {
        ...state,
        options: { ...state.options, ...action.payload },
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, ...action.payload },
      };
    case "CLEAR_ERRORS":
      return {
        ...state,
        errors: { generalError: null, downloadError: null },
      };
    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };
    case "SET_ANALYSIS_DATA":
      return {
        ...state,
        analysisData: action.payload,
      };
    case "SET_LOAD_TIMER":
      return {
        ...state,
        loadTimer: action.payload,
      };
    default:
      return state;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Processes district code by removing 'D' prefix if present
 */
const processDistrictCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined;
  return /^D\d+$/.test(code) ? code.substring(1) : code;
};

/**
 * Extracts school code from combined district-school ID
 */
const extractSchoolCode = (schoolValue: string): string => {
  if (!schoolValue) return "";
  return schoolValue.includes("-")
    ? schoolValue.split("-").pop() || schoolValue
    : schoolValue;
};

/**
 * Creates search criteria object from current filter state
 */
const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
  district_code: filters.district
    ? processDistrictCode(filters.district)
    : undefined,
  grade_code: filters.grade || undefined,
  school_code: filters.school ? extractSchoolCode(filters.school) : undefined,
  student_id: undefined,
});

/**
 * Extracts user-friendly error message from API error
 */
const extractErrorMessage = (error: ApiError): string => {
  if (error.response) {
    if (error.response.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response.status === 404) {
      return "No data found for the selected filters.";
    }
    if (error.response.status === 503) {
      return "Server is still initializing. Please try again in a moment.";
    }
  } else if (error.request) {
    return "No response from server. Please check your connection.";
  }
  return `Request error: ${error.message}`;
};

/**
 * Formats insight/recommendation text with highlighted percentages
 */
const formatTextWithHighlights = (text: string): string => {
  return text.replace(/(\d+%)/g, '<strong class="text-teal-700">$1</strong>');
};

/**
 * Safely extracts text from insight/recommendation items
 */
const getTextFromItem = (
  item: string | InsightItem | RecommendationItem
): string => {
  if (typeof item === "string") return item;
  if ("text" in item && item.text) return item.text;
  if ("insight" in item && item.insight) return item.insight;
  if ("recommendation" in item && item.recommendation)
    return item.recommendation;
  return "No content available";
};

/**
 * Creates unique key for select options
 */
const createOptionKey = (
  prefix: string,
  value: string,
  index?: number,
  additional?: string
): string => {
  return `${prefix}-${additional || "none"}-${value}${
    index !== undefined ? `-${index}` : ""
  }`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AlertsDashboard: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [state, dispatch] = useReducer(appReducer, initialState);
  const { token } = useAuth();

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================

  /**
   * Fetches initial filter options and global analysis data
   */
  const fetchInitialData = useCallback(async (): Promise<void> => {
    dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
    dispatch({ type: "CLEAR_ERRORS" });

    if (state.loadTimer) {
      clearTimeout(state.loadTimer);
    }

    try {
      // Fetch filter options
      try {
        console.log("Fetching filter options...");
        const filterOptionsRes = await alertsService.getFilterOptions();
        const { districts, schools, grades } = filterOptionsRes

        const formattedDistricts: DistrictOption[] = Array.isArray(districts)
          ? districts.map((d: any) => ({
              ...d,
              value: d.value.toString().replace(/^D/, ""),
              label: d.label,
            }))
          : [];

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            districtOptions: formattedDistricts,
            allSchoolOptions: schools || [],
          },
        });

        // Set filtered options if filters are already selected
        if (state.filters.district) {
          const filteredSchools = (schools || []).filter(
            (s: SchoolOption) => s.district === state.filters.district
          );
          dispatch({
            type: "SET_OPTIONS",
            payload: { schoolOptions: filteredSchools },
          });

          if (state.filters.school) {
            const filteredGrades = (grades || []).filter(
              (g: GradeOption) => g.school === state.filters.school
            );
            dispatch({
              type: "SET_OPTIONS",
              payload: { gradeOptions: filteredGrades },
            });
          }
        }
      } catch (err) {
        console.error("Error fetching filter options:", err);
        dispatch({
          type: "SET_ERROR",
          payload: {
            generalError: "Failed to load filter options. Please try again.",
          },
        });
      }

      // Fetch initial global analysis
      try {
        const searchCriteria = {
          district_name: "",
          gradelevel: "",
          school_name: "",
          student_id: "",
        };

        const analysisRes = await alertsService.getPredictionInsights(searchCriteria);
        dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisRes });
        dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
        dispatch({ type: "SET_LOADING", payload: { isInitialLoad: false } });
      } catch (analysisErr: any) {
        console.error("Error fetching analysis:", analysisErr);
        if (!analysisErr.message?.includes("starting up")) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              generalError: "Failed to load initial data. Please try again.",
            },
          });
        }
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);

      const timer = setTimeout(() => {
        fetchInitialData();
      }, 3000);

      dispatch({ type: "SET_LOAD_TIMER", payload: timer });
    } finally {
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
    }
  }, [state.loadTimer, state.filters.district, state.filters.school]);

  /**
   * Fetches schools for selected district
   */
  const fetchSchoolsForDistrict = useCallback(
    async (district: string): Promise<void> => {
      if (!district) {
        dispatch({
          type: "SET_OPTIONS",
          payload: { 
            schoolOptions: [],
            gradeOptions: []
          },
        });
        return;
      }
  
      try {
        // CHANGED - use alertsService instead of axiosInstance
        const filteredSchools = await alertsService.getSchoolsByDistrict({ 
          district: district 
        });
  
        const schoolsWithKeys: SchoolOption[] = filteredSchools.map(
          (school: any, index: number) => ({
            ...school,
            key: `school-${school.value}-${district}-${index}`,
            location_id: school.location_id || school.value.split("-").pop(),
            district: district, // Ensure district is set on each school
          })
        );
  
        dispatch({
          type: "SET_OPTIONS",
          payload: { 
            schoolOptions: schoolsWithKeys,
            gradeOptions: [] // Reset grades when district changes
          },
        });
  
        // Reset school and grade if no longer valid
        const currentSchoolValid = state.filters.school && 
          schoolsWithKeys.some((s: SchoolOption) => s.value === state.filters.school);
  
        if (state.filters.school && !currentSchoolValid) {
          dispatch({
            type: "SET_FILTER",
            payload: { field: "school", value: "" },
          });
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          });
        }
      } catch (error) {
        console.error("Error fetching schools for district:", error);
        dispatch({
          type: "SET_OPTIONS",
          payload: { schoolOptions: [] },
        });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "school", value: "" },
        });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      }
    },
    [state.filters.school]
  );

  /**
 * Fetches grades for selected school
 */
/**
 * Fetches grades for selected school
 */
const fetchGradesForSchool = useCallback(
  async (school: string, district: string): Promise<void> => {
    if (!school || !district) {
      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: [] },
      });
      return;
    }
    
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true },
    });

    try {
      dispatch({
        type: "SET_OPTIONS",
        payload: {
          gradeOptions: [
            {
              value: "loading",
              label: "Loading grades...",
              school,
              district,
            },
          ],
        },
      });

      // Use the full school value (which includes district-school format)
      // instead of extracting just the school code
      const schoolCode = extractSchoolCode(school);
      
      console.log("Fetching grades for:", {
        originalSchool: school,
        extractedSchoolCode: schoolCode,
        district: district
      });

      // The key fix: use the original school value or verify the extraction
      const gradesData = await alertsService.getGradesBySchool({ 
        school: school, // Use full school value instead of extracted code
        district: district 
      });

      const formattedGrades: GradeOption[] = gradesData.map((g: any) => ({
        value: g.value.toString(),
        label: g.label || `Grade ${g.value}`,
        school: school, // Use the original school value
        district: district,
      }));

      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: formattedGrades },
      });

      // Reset grade selection if current grade is not in the new list
      if (
        state.filters.grade &&
        !formattedGrades.some((g) => g.value === state.filters.grade)
      ) {
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
      if (school === state.filters.school) {
        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: [] },
        });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      }
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false },
      });
    }
  },
  [state.filters.grade, state.filters.school]
);

const fetchAnalysisData = useCallback(async (): Promise<
  AnalysisData | undefined
> => {
  dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
  dispatch({ type: "CLEAR_ERRORS" });
  dispatch({ type: "SET_UI", payload: { isGlobalView: false } });

  try {
    // FIXED - Create proper search criteria structure
    const searchCriteria: SearchCriteria = {
      district_code: state.filters.district
        ? processDistrictCode(state.filters.district)
        : undefined,
      grade_code: state.filters.grade || undefined,
      school_code: state.filters.school 
        ? extractSchoolCode(state.filters.school) 
        : undefined,
      student_id: undefined,
    };

    console.log(
      "Sending request to prediction-insights with data:",
      JSON.stringify(searchCriteria, null, 2)
    );

    // FIXED - use alertsService instead of axiosInstance
    const analysisData = await alertsService.getPredictionInsights(searchCriteria);

    console.log("Received response:", analysisData);

    dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
    dispatch({ type: "CLEAR_ERRORS" });
    return analysisData;
  } catch (err: any) {
    console.error("Error fetching analysis:", err);
    const errorMessage = err.message || "An unexpected error occurred";
    dispatch({
      type: "SET_ERROR",
      payload: { generalError: errorMessage },
    });
    throw err;
  } finally {
    dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
  }
}, [state.filters]);

  /**
   * Resets all filters and fetches global data
   */
  const resetFiltersAndFetchGlobal = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: { isLoading: true } });
      dispatch({ type: "CLEAR_ERRORS" });
      dispatch({ type: "RESET_FILTERS" });
      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: [] },
      });
  
      const searchCriteria = {
        district_code: undefined,
        grade_code: undefined,
        school_code: undefined,
      };
  
      // CHANGED - use alertsService instead of axiosInstance
      const [analysisData, schoolsData] = await Promise.all([
        alertsService.getPredictionInsights(searchCriteria),
        alertsService.getAllSchools(),
      ]);
  
      const uniqueSchools = schoolsData.reduce(
        (acc: SchoolOption[], school: SchoolOption) => {
          const uniqueKey = `school-${school.district || "none"}-${
            school.value
          }`;
          if (!acc.some((s) => s.key === uniqueKey)) {
            acc.push({ ...school, key: uniqueKey });
          }
          return acc;
        },
        []
      );
  
      dispatch({
        type: "SET_OPTIONS",
        payload: { schoolOptions: uniqueSchools },
      });
      dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
      dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
    } catch (err) {
      console.error("Error resetting analysis:", err);
      dispatch({
        type: "SET_ERROR",
        payload: { generalError: "Failed to reset data. Please try again." },
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
    }
  }, []);
  
  /**
   * Downloads a report of specified type
   */
  const downloadReport = useCallback(
    async (reportType: string): Promise<void> => {
      try {
        dispatch({
          type: "SET_LOADING",
          payload: { isDownloadingReport: true },
        });
        dispatch({ type: "SET_ERROR", payload: { downloadError: null } });
  
        const downloadCriteria: DownloadCriteria = {
          ...createSearchCriteria(state.filters),
          report_type: reportType,
        };
  
        console.log("Download criteria:", downloadCriteria);
  
        // CHANGED - use alertsService instead of axiosInstance
        const blob = await alertsService.downloadReport(reportType, downloadCriteria);
  
        // Use the service's utility methods
        const filename = alertsService.generateReportFilename(reportType);
        alertsService.triggerDownload(blob, filename);
      } catch (err: any) {
        console.error("Error in downloadReport:", err);
        const errorMessage = err.message || "An unexpected error occurred";
        dispatch({
          type: "SET_ERROR",
          payload: {
            downloadError: `Error downloading report: ${errorMessage}`,
          },
        });
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { isDownloadingReport: false },
        });
      }
    },
    [state.filters]
  );

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFilterChange = useCallback(
    (field: keyof FilterState, value: string) => {
      // If district is changing, clear school and grade filters
      if (field === 'district' && value !== state.filters.district) {
        dispatch({ type: "SET_FILTER", payload: { field: "district", value } });
        dispatch({ type: "SET_FILTER", payload: { field: "school", value: "" } });
        dispatch({ type: "SET_FILTER", payload: { field: "grade", value: "" } });
      } else {
        dispatch({ type: "SET_FILTER", payload: { field, value } });
      }
    },
    [state.filters.district]
  );

  const handleToggleFilters = useCallback(() => {
    dispatch({
      type: "SET_UI",
      payload: { showFilters: !state.ui.showFilters },
    });
  }, [state.ui.showFilters]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Set auth token when it changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();

    return () => {
      if (state.loadTimer) {
        clearTimeout(state.loadTimer);
      }
    };
  }, []);

  // Fetch schools when district changes
  useEffect(() => {
    fetchSchoolsForDistrict(state.filters.district);
  }, [state.filters.district, fetchSchoolsForDistrict]);

  // Fetch grades when school changes
  useEffect(() => {
    if (state.filters.school) {
      // Only fetch grades if we have a valid school selected
      fetchGradesForSchool(state.filters.school, state.filters.district);
    } else {
      // Clear grades if no school is selected
      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: [] },
      });
      dispatch({
        type: "SET_FILTER",
        payload: { field: "grade", value: "" },
      });
    }
  }, [state.filters.school, state.filters.district, fetchGradesForSchool]);

  // ============================================================================
  // RENDER HELPER COMPONENTS
  // ============================================================================

  /**
   * Loading skeleton for summary cards
   */
  const LoadingSkeletonCards: React.FC = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="animate-pulse h-32">
          <CardHeader className="pb-2">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );

  /**
   * Report downloading modal overlay
   */
  const ReportDownloadingModal: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span>Preparing your report...</span>
        </div>
      </div>
    </div>
  );

  /**
   * Filter section component
   */
  const FilterSection: React.FC = () => (
    <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
      {/* District Filter */}
      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="district-select"
        >
          District
        </label>
        <select
          id="district-select"
          value={state.filters.district}
          onChange={(e) => handleFilterChange("district", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
          disabled={state.loading.isInitialLoad}
          aria-label="Select district"
        >
          <option value="">Select District</option>
          {state.options.districtOptions.map((d, index) => (
            <option
              key={createOptionKey("district", d.value, index)}
              value={d.value}
            >
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* School Filter */}
      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="school-select"
        >
          School
        </label>
        <select
          id="school-select"
          value={state.filters.school}
          onChange={(e) => handleFilterChange("school", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!state.filters.district || !state.options.schoolOptions.length || state.loading.isInitialLoad}
          aria-label="Select school"
        >
          <option value="">Select School</option>
          {state.options.schoolOptions.map((s, index) => (
            <option
              key={createOptionKey("school", s.value, index, s.district)}
              value={s.value}
            >
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grade Filter */}
      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="grade-select"
        >
          Grade
        </label>
        <select
          id="grade-select"
          value={state.filters.grade}
          onChange={(e) => handleFilterChange("grade", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!state.options.gradeOptions.length || state.loading.isLoading}
          aria-label="Select grade"
        >
          <option value="">Select Grade</option>
          {state.options.gradeOptions.map((g, index) => (
            <option
              key={createOptionKey("grade", g.value, index, g.school)}
              value={g.value}
            >
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={fetchAnalysisData}
          className={`bg-[#03787c] text-white px-3 py-2 rounded text-sm hover:bg-[#026266] w-full ${
            state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={state.loading.isInitialLoad}
          aria-label="Search for analysis data"
        >
          Search
        </button>
        <button
          onClick={resetFiltersAndFetchGlobal}
          className={`bg-white text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-50 w-full border border-[#E9E9E9] shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] ${
            state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={state.loading.isInitialLoad}
          aria-label="Reset all filters"
        >
          Reset
        </button>
      </div>

      {/* Download Reports Section */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Download Reports</h3>
        <div className="space-y-2">
          <button
            onClick={() => downloadReport("summary")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
            aria-label="Download summary report"
          >
            <Download size={16} />
            Summary Report
          </button>
          <button
            onClick={() => downloadReport("detailed")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
            aria-label="Download detailed report"
          >
            <Download size={16} />
            Detailed Report
          </button>
          <button
            onClick={() => downloadReport("below_85")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
            aria-label="Download below 85% attendance report"
          >
            <Download size={16} />
            Below 85% Report
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Summary statistics cards
   */
  const SummaryCards: React.FC = () => {
    if (!state.analysisData) return null;

    const cardConfigs = [
      {
        title: "Total Students",
        value: state.analysisData.summary_statistics.total_students,
        reportType: "summary",
        icon: null,
      },
      {
        title: "Below 85% Attendance",
        value: state.analysisData.summary_statistics.below_85_students,
        reportType: "below_85",
        icon: <AlertCircle size={14} className="text-[#03787c]" />,
      },
      {
        title: "Tier 1 Students (≥95%)",
        value: state.analysisData.summary_statistics.tier1_students,
        reportType: "tier1",
        icon: null,
      },
      {
        title: "Tier 4 Students (<80%)",
        value: state.analysisData.summary_statistics.tier4_students,
        reportType: "tier4",
        icon: null,
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardConfigs.map((config, index) => (
          <Card key={index} className="bg-white border border-[#C0D5DE]">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-base flex items-center gap-1">
                {config.icon}
                {config.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-1 flex justify-between items-center">
              <span className="text-2xl font-semibold">{config.value}</span>
              <button
                onClick={() => downloadReport(config.reportType)}
                className="text-xs bg-[#03787c] text-white p-1 rounded flex items-center gap-1 hover:bg-[#026266]"
                title={`Download ${config.title} Report`}
                aria-label={`Download ${config.title} report`}
              >
                <Download size={12} />
                Export
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * AI Insights and Recommendations panels
   */
  const InsightsAndRecommendations: React.FC = () => {
    if (!state.analysisData) return null;

    const InsightPanel: React.FC<{
      title: string;
      icon: string;
      items: Array<string | InsightItem | RecommendationItem>;
      emptyMessage: string;
    }> = ({ title, icon, items, emptyMessage }) => (
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-[#03787c] text-white px-4 h-11 flex items-center rounded-t-lg">
          <span className="text-sm mr-2" role="img" aria-label={title}>
            {icon}
          </span>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="overflow-y-auto max-h-[360px] p-3 bg-white rounded-b-lg text-xs">
          {items?.length > 0 ? (
            <ul className="space-y-3" role="list">
              {items.map((item, index) => {
                const text = getTextFromItem(item);
                const formattedText = formatTextWithHighlights(text);

                return (
                  <li
                    key={index}
                    className="text-gray-800 text-sm leading-relaxed"
                    role="listitem"
                  >
                    <div className="flex items-start">
                      <span
                        className="text-teal-600 mr-2 mt-1"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <span
                        dangerouslySetInnerHTML={{ __html: formattedText }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          )}
        </div>
      </div>
    );

    return (
      <div className="w-full flex flex-col md:flex-row gap-5 mt-4">
        <InsightPanel
          title="AI DRIVEN Key Insights"
          icon="ℹ️"
          items={state.analysisData.key_insights}
          emptyMessage="No insights available"
        />
        <InsightPanel
          title="AI Recommendations"
          icon="✅"
          items={state.analysisData.recommendations}
          emptyMessage="No recommendations available"
        />
      </div>
    );
  };

  /**
   * Status notifications (error, global view, loading)
   */
  const StatusNotifications: React.FC = () => (
    <>
      {/* Error Notification */}
      {state.errors.generalError && (
        <div className="w-full">
          <div
            className="bg-yellow-50 border-l-4 border-yellow-500 p-3"
            role="alert"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="animate-spin h-5 w-5 text-yellow-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {state.errors.generalError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global View Notification */}
      {state.ui.isGlobalView && state.analysisData && (
        <div className="w-full">
          <div
            className="bg-blue-50 border-l-4 border-blue-500 p-3"
            role="status"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <Globe className="h-5 w-5 text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Viewing Global Analysis - Showing data for all districts,
                  schools, and grades
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Notification */}
      {(state.loading.isLoading || state.loading.isInitialLoad) &&
        !state.errors.generalError && (
          <div className="w-full">
            <div className="flex justify-center items-center w-full mb-2">
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-blue-700 text-sm">
                  Loading dashboard data...
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <LoadingSkeletonCards />
            </div>
          </div>
        )}
    </>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50/50 relative">
      {/* Download Progress Modal */}
      {state.loading.isDownloadingReport && <ReportDownloadingModal />}

      <div className="container mx-auto px-4 py-4 max-w-full">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">Alerts Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Monitor alerts and notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFilters}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                aria-label={
                  state.ui.showFilters ? "Hide filters" : "Show filters"
                }
              >
                {state.ui.showFilters ? "Hide Filters" : "Show Filters"}
                {state.ui.showFilters ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>
          </div>
          <div className="w-full h-0.5 bg-gray-200 mt-2"></div>
        </div>

        <div className="flex w-full min-h-screen flex-col lg:flex-row gap-4">
          {/* Filter Section */}
          {state.ui.showFilters && <FilterSection />}

          {/* Main Dashboard */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex flex-col gap-4">
              {/* Status Notifications */}
              <StatusNotifications />

              {/* Dashboard Content */}
              {!state.loading.isLoading &&
                !state.loading.isInitialLoad &&
                state.analysisData && (
                  <>
                    <SummaryCards />
                    <InsightsAndRecommendations />
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsDashboard;
