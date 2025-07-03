// // import { SchoolOption, InsightItem, RecommendationItem } from './reducer';

// // /**
// //  * Processes district code by removing 'D' prefix if present
// //  */
// // export const processDistrictCode = (code: string | undefined): string | undefined => {
// //   if (!code) return undefined;
// //   return /^D\d+$/.test(code) ? code.substring(1) : code;
// // };

// // /**
// //  * Extracts school code from combined district-school ID
// //  */
// // export const extractSchoolCode = (schoolValue: string): string => {
// //   if (!schoolValue) return "";
// //   return schoolValue.includes('-') ? schoolValue.split('-').pop() || schoolValue : schoolValue;
// // };

// // /**
// //  * Creates search criteria object from current filter state
// //  */
// // export const createSearchCriteria = (filters: { district: string; school: string; grade: string }): {
// //   district_name: string;
// //   gradelevel: string;
// //   school_name: string;
// //   student_id: string;
// // } => ({
// //   district_name: filters.district || "",
// //   gradelevel: filters.grade || "",
// //   school_name: filters.school ? extractSchoolCode(filters.school) : "",
// //   student_id: ""
// // });

// // /**
// //  * Extracts user-friendly error message from API error
// //  */
// // export const extractErrorMessage = (error: any): string => {
// //   if (error.response) {
// //     if (error.response.data?.detail) {
// //       return error.response.data.detail;
// //     }
// //     if (error.response.status === 404) {
// //       return 'No data found for the selected filters.';
// //     }
// //     if (error.response.status === 503) {
// //       return 'Server is still initializing. Please try again in a moment.';
// //     }
// //   } else if (error.request) {
// //     return 'No response from server. Please check your connection.';
// //   }
// //   return `Request error: ${error.message || 'Unknown error occurred'}`;
// // };

// // /**
// //  * Formats insight/recommendation text with highlighted percentages
// //  */
// // export const formatTextWithHighlights = (text: string): string => {
// //   return text.replace(/(\d+%)/g, '<strong class="text-teal-700">$1</strong>');
// // };

// // /**
// //  * Safely extracts text from insight/recommendation items
// //  */
// // export const getTextFromItem = (item: string | InsightItem | RecommendationItem): string => {
// //   if (typeof item === 'string') return item;
// //   if ('text' in item && item.text) return item.text;
// //   if ('insight' in item && item.insight) return item.insight;
// //   if ('recommendation' in item && item.recommendation) return item.recommendation;
// //   return 'No content available';
// // };

// // /**
// //  * Creates unique key for select options
// //  */
// // export const createOptionKey = (prefix: string, value: string, index?: number, additional?: string): string => {
// //   return `${prefix}-${additional || 'none'}-${value}${index !== undefined ? `-${index}` : ''}`;
// // };

// // /**
// //  * Filters schools based on selected district
// //  */
// // export const filterSchoolsByDistrict = (schools: SchoolOption[], district: string): SchoolOption[] => {
// //   if (!district) return [];
// //   return schools.filter(school => school.district === district);
// // };

// // /**
// //  * Filters grades based on selected school
// //  */
// // export const filterGradesBySchool = (grades: any[], school: string): any[] => {
// //   if (!school) return [];
// //   return grades.filter(grade => grade.school === school);
// // };
// import {
//   FilterState,
//   SearchCriteria,
//   ApiError,
//   InsightItem,
//   RecommendationItem
// } from './reducer';

// // ============================================================================
// // UTILITY FUNCTIONS
// // ============================================================================

// /**
//  * Processes district code by removing 'D' prefix if present
//  */
// export const processDistrictCode = (code: string | undefined): string | undefined => {
//   if (!code) return undefined;
//   return /^D\d+$/.test(code) ? code.substring(1) : code;
// };

// /**
//  * Extracts school code from combined district-school ID
//  */
// export const extractSchoolCode = (schoolValue: string): string => {
//   if (!schoolValue) return "";
//   return schoolValue.includes('-') ? schoolValue.split('-').pop() || schoolValue : schoolValue;
// };

// /**
//  * Creates search criteria object from current filter state
//  */
// export const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
//   district_code: filters.district ? processDistrictCode(filters.district) : undefined,
//   grade_code: filters.grade || undefined,
//   school_code: filters.school ? extractSchoolCode(filters.school) : undefined,
//   student_id: undefined
// });

// /**
//  * Extracts user-friendly error message from API error
//  */
// export const extractErrorMessage = (error: ApiError): string => {
//   if (error.response) {
//     if (error.response.data?.detail) {
//       return error.response.data.detail;
//     }
//     if (error.response.status === 404) {
//       return 'No data found for the selected filters.';
//     }
//     if (error.response.status === 503) {
//       return 'Server is still initializing. Please try again in a moment.';
//     }
//   } else if (error.request) {
//     return 'No response from server. Please check your connection.';
//   }
//   return `Request error: ${error.message}`;
// };

// /**
//  * Formats insight/recommendation text with highlighted percentages
//  */
// export const formatTextWithHighlights = (text: string): string => {
//   return text.replace(/(\d+%)/g, '<strong class="text-teal-700">$1</strong>');
// };

// /**
//  * Safely extracts text from insight/recommendation items
//  */
// export const getTextFromItem = (item: string | InsightItem | RecommendationItem): string => {
//   if (typeof item === 'string') return item;
//   if ('text' in item && item.text) return item.text;
//   if ('insight' in item && item.insight) return item.insight;
//   if ('recommendation' in item && item.recommendation) return item.recommendation;
//   return 'No content available';
// };

// /**
//  * Creates unique key for select options
//  */
// export const createOptionKey = (prefix: string, value: string, index?: number, additional?: string): string => {
//   return `${prefix}-${additional || 'none'}-${value}${index !== undefined ? `-${index}` : ''}`;
// };
