// // import React from 'react';
// // import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// // import { Globe, AlertCircle, Download, ChevronUp, ChevronDown } from "lucide-react";
// // import { AnalysisData, AppState, AppAction, DistrictOption, SchoolOption, GradeOption } from './reducer';
// // import { formatTextWithHighlights, getTextFromItem } from './utils';

// // interface FilterControlsProps {
// //   state: AppState;
// //   dispatch: React.Dispatch<AppAction>;
// //   onFilterChange: (field: keyof AppState['filters'], value: string) => void;
// //   onSearch: () => void;
// //   onReset: () => void;
// // }

// // export const FilterControls: React.FC<FilterControlsProps> = ({
// //   state,
// //   dispatch,
// //   onFilterChange,
// //   onSearch,
// //   onReset
// // }) => (
// //   <Card className="mb-6">
// //     <CardHeader className="pb-3">
// //       <div className="flex justify-between items-center">
// //         <CardTitle className="text-lg">Filters</CardTitle>
// //         <button
// //           onClick={() => dispatch({ type: 'SET_UI', payload: { showFilters: !state.ui.showFilters } })}
// //           className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
// //         >
// //           {state.ui.showFilters ? (
// //             <>
// //               <ChevronUp className="w-4 h-4 mr-1" /> Hide
// //             </>
// //           ) : (
// //             <>
// //               <ChevronDown className="w-4 h-4 mr-1" /> Show
// //             </>
// //           )}
// //         </button>
// //       </div>
// //     </CardHeader>

// //     {state.ui.showFilters && (
// //       <CardContent>
// //         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
// //           <div>
// //             <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
// //             <select
// //               value={state.filters.district}
// //               onChange={(e) => onFilterChange('district', e.target.value)}
// //               className="w-full p-2 border rounded-md"
// //             >
// //               <option value="">Select District</option>
// //               {state.options.districtOptions.map((option) => (
// //                 <option key={option.value} value={option.value}>
// //                   {option.label}
// //                 </option>
// //               ))}
// //             </select>
// //           </div>

// //           <div>
// //             <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
// //             <select
// //               value={state.filters.school}
// //               onChange={(e) => onFilterChange('school', e.target.value)}
// //               disabled={!state.filters.district}
// //               className="w-full p-2 border rounded-md"
// //             >
// //               <option value="">Select School</option>
// //               {state.options.schoolOptions.map((option) => (
// //                 <option key={option.value} value={option.value}>
// //                   {option.label}
// //                 </option>
// //               ))}
// //             </select>
// //           </div>

// //           <div>
// //             <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
// //             <select
// //               value={state.filters.grade}
// //               onChange={(e) => onFilterChange('grade', e.target.value)}
// //               disabled={!state.filters.school}
// //               className="w-full p-2 border rounded-md"
// //             >
// //               <option value="">Select Grade</option>
// //               {state.options.gradeOptions.map((option) => (
// //                 <option key={option.value} value={option.value}>
// //                   {option.label}
// //                 </option>
// //               ))}
// //             </select>
// //           </div>
// //         </div>

// //         <div className="flex space-x-3">
// //           <button
// //             onClick={onSearch}
// //             disabled={state.loading.isLoading}
// //             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
// //           >
// //             {state.loading.isLoading ? 'Loading...' : 'Apply Filters'}
// //           </button>

// //           <button
// //             onClick={onReset}
// //             className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
// //           >
// //             Reset
// //           </button>
// //         </div>
// //       </CardContent>
// //     )}
// //   </Card>
// // );

// // interface StatsCardProps {
// //   title: string;
// //   value: number | string;
// //   icon: React.ReactNode;
// //   className?: string;
// // }

// // export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, className = '' }) => (
// //   <Card className={`flex-1 ${className}`}>
// //     <CardContent className="p-6">
// //       <div className="flex items-center justify-between">
// //         <div>
// //           <p className="text-sm font-medium text-gray-500">{title}</p>
// //           <h3 className="text-2xl font-bold mt-1">{value}</h3>
// //         </div>
// //         <div className="p-3 rounded-full bg-blue-100 text-blue-600">
// //           {icon}
// //         </div>
// //       </div>
// //     </CardContent>
// //   </Card>
// // );

// // interface AnalysisSectionProps {
// //   title: string;
// //   items: Array<string | { text?: string; insight?: string; recommendation?: string }>;
// //   emptyMessage: string;
// //   icon: React.ReactNode;
// // }

// // export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
// //   title,
// //   items,
// //   emptyMessage,
// //   icon
// // }) => (
// //   <Card className="mb-6">
// //     <CardHeader className="pb-3">
// //       <div className="flex items-center">
// //         <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
// //           {icon}
// //         </div>
// //         <CardTitle className="text-lg">{title}</CardTitle>
// //       </div>
// //     </CardHeader>
// //     <CardContent>
// //       {items && items.length > 0 ? (
// //         <ul className="space-y-4">
// //           {items.map((item, index) => {
// //             const text = getTextFromItem(item);
// //             return (
// //               <li key={index} className="flex items-start">
// //                 <div className="flex-shrink-0 h-5 w-5 text-blue-500 mr-2">•</div>
// //                 <div
// //                   className="prose prose-sm max-w-none"
// //                   dangerouslySetInnerHTML={{ __html: formatTextWithHighlights(text) }}
// //                 />
// //               </li>
// //             );
// //           })}
// //         </ul>
// //       ) : (
// //         <p className="text-gray-500">{emptyMessage}</p>
// //       )}
// //     </CardContent>
// //   </Card>
// // );

// // interface DownloadButtonProps {
// //   onClick: () => void;
// //   disabled: boolean;
// //   isDownloading: boolean;
// // }

// // export const DownloadButton: React.FC<DownloadButtonProps> = ({
// //   onClick,
// //   disabled,
// //   isDownloading
// // }) => (
// //   <button
// //     onClick={onClick}
// //     disabled={disabled || isDownloading}
// //     className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
// //   >
// //     <Download className="w-4 h-4 mr-2" />
// //     {isDownloading ? 'Downloading...' : 'Download Report'}
// //   </button>
// // );
// import React from "react";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
// } from "../../predictions/src/components/ui/card";
// import {
//   Globe,
//   AlertCircle,
//   Download,
//   ChevronUp,
//   ChevronDown,
// } from "lucide-react";
// import {
//   AppState,
//   FilterState,
//   AnalysisData,
//   InsightItem,
//   RecommendationItem,
// } from "./reducer";
// import {
//   createOptionKey,
//   formatTextWithHighlights,
//   getTextFromItem,
// } from "./utils";

// // ============================================================================
// // COMPONENT PROP INTERFACES
// // ============================================================================

// interface FilterSectionProps {
//   state: AppState;
//   onFilterChange: (field: keyof FilterState, value: string) => void;
//   onSearch: () => void;
//   onReset: () => void;
//   onDownloadReport: (reportType: string) => void;
// }

// interface SummaryCardsProps {
//   analysisData: AnalysisData;
//   onDownloadReport: (reportType: string) => void;
// }

// interface InsightsAndRecommendationsProps {
//   analysisData: AnalysisData;
// }

// interface StatusNotificationsProps {
//   state: AppState;
// }

// interface InsightPanelProps {
//   title: string;
//   icon: string;
//   items: Array<string | InsightItem | RecommendationItem>;
//   emptyMessage: string;
// }

// // ============================================================================
// // COMPONENT DEFINITIONS
// // ============================================================================

// /**
//  * Loading skeleton for summary cards
//  */
// export const LoadingSkeletonCards: React.FC = () => (
//   <>
//     {[1, 2, 3, 4, 5].map((i) => (
//       <Card key={i} className="animate-pulse h-32">
//         <CardHeader className="pb-2">
//           <div className="h-5 bg-gray-200 rounded w-24"></div>
//         </CardHeader>
//         <CardContent>
//           <div className="h-8 bg-gray-200 rounded w-16"></div>
//         </CardContent>
//       </Card>
//     ))}
//   </>
// );

// /**
//  * Report downloading modal overlay
//  */
// export const ReportDownloadingModal: React.FC = () => (
//   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//     <div className="bg-white p-4 rounded-lg shadow-lg">
//       <div className="flex items-center space-x-2">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//         <span>Preparing your report...</span>
//       </div>
//     </div>
//   </div>
// );

// /**
//  * Filter section component
//  */
// export const FilterSection: React.FC<FilterSectionProps> = ({
//   state,
//   onFilterChange,
//   onSearch,
//   onReset,
//   onDownloadReport,
// }) => (
//   <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
//     {/* District Filter */}
//     <div className="mb-4">
//       <label
//         className="block text-sm font-medium mb-1"
//         htmlFor="district-select"
//       >
//         District
//       </label>
//       <select
//         id="district-select"
//         value={state.filters.district}
//         onChange={(e) => onFilterChange("district", e.target.value)}
//         className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//         disabled={state.loading.isInitialLoad}
//         aria-label="Select district"
//       >
//         <option value="">Select District</option>
//         {state.options.districtOptions.map((d, index) => (
//           <option
//             key={createOptionKey("district", d.value, index)}
//             value={d.value}
//           >
//             {d.label}
//           </option>
//         ))}
//       </select>
//     </div>

//     {/* School Filter */}
//     <div className="mb-4">
//       <label className="block text-sm font-medium mb-1" htmlFor="school-select">
//         School
//       </label>
//       <select
//         id="school-select"
//         value={state.filters.school}
//         onChange={(e) => onFilterChange("school", e.target.value)}
//         className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//         disabled={
//           !state.options.schoolOptions.length || state.loading.isInitialLoad
//         }
//         aria-label="Select school"
//       >
//         <option value="">Select School</option>
//         {state.options.schoolOptions.map((s) => (
//           <option
//             key={createOptionKey("school", s.value, undefined, s.district)}
//             value={s.value}
//           >
//             {s.label}
//           </option>
//         ))}
//       </select>
//     </div>

//     {/* Grade Filter */}
//     <div className="mb-4">
//       <label className="block text-sm font-medium mb-1" htmlFor="grade-select">
//         Grade
//       </label>
//       <select
//         id="grade-select"
//         value={state.filters.grade}
//         onChange={(e) => onFilterChange("grade", e.target.value)}
//         className="w-full p-2 border rounded text-sm bg-white border-[#C0D5DE] border-[1.6px]"
//         disabled={
//           !state.options.gradeOptions.length || state.loading.isInitialLoad
//         }
//         aria-label="Select grade"
//       >
//         <option value="">Select Grade</option>
//         {state.options.gradeOptions.map((g, index) => (
//           <option
//             key={createOptionKey("grade", g.value, index, g.school)}
//             value={g.value}
//           >
//             {g.label}
//           </option>
//         ))}
//       </select>
//     </div>

//     {/* Action Buttons */}
//     <div className="flex gap-2">
//       <button
//         onClick={onSearch}
//         className={`bg-[#03787c] text-white px-3 py-2 rounded text-sm hover:bg-[#026266] w-full ${
//           state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
//         }`}
//         disabled={state.loading.isInitialLoad}
//         aria-label="Search for analysis data"
//       >
//         Search
//       </button>
//       <button
//         onClick={onReset}
//         className={`bg-white text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-50 w-full border border-[#E9E9E9] shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] ${
//           state.loading.isInitialLoad ? "opacity-50 cursor-not-allowed" : ""
//         }`}
//         disabled={state.loading.isInitialLoad}
//         aria-label="Reset all filters"
//       >
//         Reset
//       </button>
//     </div>

//     {/* Download Reports Section */}
//     <div className="mt-6 border-t pt-4">
//       <h3 className="text-sm font-medium mb-3">Download Reports</h3>
//       <div className="space-y-2">
//         <button
//           onClick={() => onDownloadReport("summary")}
//           className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//           aria-label="Download summary report"
//         >
//           <Download size={16} />
//           Summary Report
//         </button>
//         <button
//           onClick={() => onDownloadReport("detailed")}
//           className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//           aria-label="Download detailed report"
//         >
//           <Download size={16} />
//           Detailed Report
//         </button>
//         <button
//           onClick={() => onDownloadReport("below_85")}
//           className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50"
//           aria-label="Download below 85% attendance report"
//         >
//           <Download size={16} />
//           Below 85% Report
//         </button>
//       </div>
//     </div>
//   </div>
// );

// /**
//  * Summary statistics cards
//  */
// export const SummaryCards: React.FC<SummaryCardsProps> = ({
//   analysisData,
//   onDownloadReport,
// }) => {
//   const cardConfigs = [
//     {
//       title: "Total Students",
//       value: analysisData.summary_statistics.total_students,
//       reportType: "summary",
//       icon: null,
//     },
//     {
//       title: "Below 85% Attendance",
//       value: analysisData.summary_statistics.below_85_students,
//       reportType: "below_85",
//       icon: <AlertCircle size={14} className="text-[#03787c]" />,
//     },
//     {
//       title: "Tier 1 Students (≥95%)",
//       value: analysisData.summary_statistics.tier1_students,
//       reportType: "tier1",
//       icon: null,
//     },
//     {
//       title: "Tier 4 Students (<80%)",
//       value: analysisData.summary_statistics.tier4_students,
//       reportType: "tier4",
//       icon: null,
//     },
//   ];

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//       {cardConfigs.map((config, index) => (
//         <Card key={index} className="bg-white border border-[#C0D5DE]">
//           <CardHeader className="pb-1 pt-3">
//             <CardTitle className="text-base flex items-center gap-1">
//               {config.icon}
//               {config.title}
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="pb-3 pt-1 flex justify-between items-center">
//             <span className="text-2xl font-semibold">{config.value}</span>
//             <button
//               onClick={() => onDownloadReport(config.reportType)}
//               className="text-xs bg-[#03787c] text-white p-1 rounded flex items-center gap-1 hover:bg-[#026266]"
//               title={`Download ${config.title} Report`}
//               aria-label={`Download ${config.title} report`}
//             >
//               <Download size={12} />
//               Export
//             </button>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// };

// /**
//  * Insight panel component
//  */
// const InsightPanel: React.FC<InsightPanelProps> = ({
//   title,
//   icon,
//   items,
//   emptyMessage,
// }) => (
//   <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
//     <div className="bg-[#03787c] text-white px-4 h-11 flex items-center rounded-t-lg">
//       <span className="text-sm mr-2" role="img" aria-label={title}>
//         {icon}
//       </span>
//       <h3 className="font-semibold text-sm">{title}</h3>
//     </div>
//     <div className="overflow-y-auto max-h-[360px] p-3 bg-white rounded-b-lg text-xs">
//       {items?.length > 0 ? (
//         <ul className="space-y-3" role="list">
//           {items.map((item, index) => {
//             const text = getTextFromItem(item);
//             const formattedText = formatTextWithHighlights(text);

//             return (
//               <li
//                 key={index}
//                 className="text-gray-800 text-sm leading-relaxed"
//                 role="listitem"
//               >
//                 <div className="flex items-start">
//                   <span className="text-teal-600 mr-2 mt-1" aria-hidden="true">
//                     •
//                   </span>
//                   <span dangerouslySetInnerHTML={{ __html: formattedText }} />
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       ) : (
//         <p className="text-gray-500 text-sm">{emptyMessage}</p>
//       )}
//     </div>
//   </div>
// );

// /**
//  * AI Insights and Recommendations panels
//  */
// export const InsightsAndRecommendations: React.FC<
//   InsightsAndRecommendationsProps
// > = ({ analysisData }) => (
//   <div className="w-full flex flex-col md:flex-row gap-5 mt-4">
//     <InsightPanel
//       title="AI DRIVEN Key Insights"
//       icon="ℹ️"
//       items={analysisData.key_insights}
//       emptyMessage="No insights available"
//     />
//     <InsightPanel
//       title="AI Recommendations"
//       icon="✅"
//       items={analysisData.recommendations}
//       emptyMessage="No recommendations available"
//     />
//   </div>
// );

// /**
//  * Status notifications (error, global view, loading)
//  */
// export const StatusNotifications: React.FC<StatusNotificationsProps> = ({
//   state,
// }) => (
//   <>
//     {/* Error Notification */}
//     {state.errors.generalError && (
//       <div className="w-full">
//         <div
//           className="bg-yellow-50 border-l-4 border-yellow-500 p-3"
//           role="alert"
//         >
//           <div className="flex">
//             <div className="flex-shrink-0">
//               <svg
//                 className="animate-spin h-5 w-5 text-yellow-500"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 aria-hidden="true"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 ></circle>
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                 ></path>
//               </svg>
//             </div>
//             <div className="ml-3">
//               <p className="text-sm text-yellow-700">
//                 {state.errors.generalError}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     )}

//     {/* Global View Notification */}
//     {state.ui.isGlobalView && state.analysisData && (
//       <div className="w-full">
//         <div
//           className="bg-blue-50 border-l-4 border-blue-500 p-3"
//           role="status"
//         >
//           <div className="flex">
//             <div className="flex-shrink-0">
//               <Globe className="h-5 w-5 text-blue-500" aria-hidden="true" />
//             </div>
//             <div className="ml-3">
//               <p className="text-sm text-blue-700">
//                 Viewing Global Analysis - Showing data for all districts,
//                 schools, and grades
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     )}

//     {/* Loading Notification */}
//     {(state.loading.isLoading || state.loading.isInitialLoad) &&
//       !state.errors.generalError && (
//         <div className="w-full">
//           <div className="flex justify-center items-center w-full mb-2">
//             <div className="flex items-center justify-center gap-2">
//               <svg
//                 className="animate-spin h-5 w-5 text-blue-500"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 aria-hidden="true"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 ></circle>
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                 ></path>
//               </svg>
//               <p className="text-blue-700 text-sm">Loading dashboard data...</p>
//             </div>
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
//             <LoadingSkeletonCards />
//           </div>
//         </div>
//       )}
//   </>
// );
