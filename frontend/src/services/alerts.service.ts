// import axiosInstance from "@/lib/axios";


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
//   totalStudents: number;
//   below85Students: number;
//   tier1Students: number;
//   tier4Students: number;
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
//   summaryStatistics: SummaryStatistics;
//   keyInsights: Array<string | InsightItem>;
//   recommendations: Array<string | RecommendationItem>;
// }

// export interface FilterOptionsResponse {
//   districts: DistrictOption[];
//   schools: SchoolOption[];
//   grades: GradeOption[];
// }

// export interface SearchCriteria {
//   districtCode?: string;
//   gradeCode?: string;
//   schoolCode?: string;
// }

// export interface DownloadCriteria extends SearchCriteria {
//   reportType?: string;
// }

// export interface SchoolFilterParams {
//   district: string;
// }

// export interface GradeFilterParams {
//   school: string;
//   district: string;
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


// class AlertsService {
//   async getFilterOptions(): Promise<FilterOptionsResponse> {
//     try {
//       const response = await axiosInstance.get<FilterOptionsResponse>(
//         "filter-options"
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Error fetching filter options:", error);
//       throw this.handleError(error as ApiError);
//     }
//   }


//   async getSchoolsByDistrict(params: {
//     district: string;
//   }): Promise<SchoolOption[]> {
//     try {
//       const response = await axiosInstance.get<SchoolOption[]>(
//         `schools/district/${params.district}`
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Error fetching schools for district:", error);
//       throw this.handleError(error as ApiError);
//     }
//   }

//   async getAllSchools(): Promise<SchoolOption[]> {
//     try {
//       const response = await axiosInstance.get<SchoolOption[]>(
//         `schools/district/-1`
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Error fetching all schools:", error);
//       throw this.handleError(error as ApiError);
//     }
//   }
  
//   async getGradesBySchool(params: {
//     school: string;
//     district: string;
//   }): Promise<GradeOption[]> {
//     try {
//       console.log("Sending grades request with params:", params);

//       const response = await axiosInstance.get<GradeOption[]>(
//         `grades/district/${params.district}/school/${params.school}`
//       );

//       console.log("Received grades response:", response.data);
//       return response.data;
//     } catch (error) {
//       console.error("Error fetching grades for school:", error);
//       throw this.handleError(error as ApiError);
//     }
//   }


//   async getPredictionInsights(criteria: SearchCriteria): Promise<AnalysisData> {
//     try {
//       const response = await axiosInstance.post<AnalysisData>(
//         "prediction-insights",
//         criteria,
//         {
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       console.error("Error fetching prediction insights:", error);
//       throw this.handleError(error as ApiError);
//     }
//   }

 
//   async downloadReport(
//     reportType: string,
//     criteria: DownloadCriteria
//   ): Promise<Blob> {
//     try {
//       const downloadCriteria: DownloadCriteria = {
//         ...criteria,
//         reportType: reportType,
//       };

//       const response = await axiosInstance.post(
//         `download/report/${reportType}`,
//         downloadCriteria,
//         {
//           responseType: "blob",
//         }
//       );

//       return response.data;
//     } catch (error) {
//       console.error(`Error downloading ${reportType} report:`, error);
//       throw this.handleError(error as ApiError);
//     }
//   }


//   async downloadSummaryReport(criteria: DownloadCriteria): Promise<Blob> {
//     return this.downloadReport("summary", criteria);
//   }

 
//   async downloadDetailedReport(criteria: DownloadCriteria): Promise<Blob> {
//     return this.downloadReport("detailed", criteria);
//   }


//   async downloadBelow85Report(criteria: DownloadCriteria): Promise<Blob> {
//     return this.downloadReport("below_85", criteria);
//   }

 
//   async downloadTier1Report(criteria: DownloadCriteria): Promise<Blob> {
//     return this.downloadReport("tier1", criteria);
//   }

 
//   async downloadTier4Report(criteria: DownloadCriteria): Promise<Blob> {
//     return this.downloadReport("tier4", criteria);
//   }


//   private handleError(error: ApiError): Error {
//     let message = "An unexpected error occurred";

//     if (error.response) {
//       if (error.response.data?.detail) {
//         message = error.response.data.detail;
//       } else if (error.response.status === 404) {
//         message = "No data found for the selected filters.";
//       } else if (error.response.status === 503) {
//         message = "Server is still initializing. Please try again in a moment.";
//       } else {
//         message = `Server error: ${error.response.status}`;
//       }
//     } else if (error.request) {
//       message = "No response from server. Please check your connection.";
//     } else if (error.message) {
//       message = `Request error: ${error.message}`;
//     }

//     return new Error(message);
//   }

 
//   triggerDownload(blob: Blob, filename: string): void {
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   }


//   generateReportFilename(
//     reportType: string,
//     extension: string = "xlsx"
//   ): string {
//     const timestamp = new Date().toISOString().split("T")[0];
//     return `attendance_${reportType}_${timestamp}.${extension}`;
//   }
// }


// export const alertsService = new AlertsService();
// export default alertsService;
import axiosInstance from "@/lib/axios";


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

export interface AnalysisData {
  summaryStatistics: SummaryStatistics;
  keyInsights: Array<string | InsightItem>;
  recommendations: Array<string | RecommendationItem>;
}

export interface FilterOptionsResponse {
  districts: DistrictOption[];
  schools: SchoolOption[];
  grades: GradeOption[];
}

export interface SearchCriteria {
  districtCode?: string;
  gradeCode?: string;
  schoolCode?: string;
}

export interface DownloadCriteria extends SearchCriteria {
  reportType?: string;
}

export interface SchoolFilterParams {
  district: string;
}

export interface GradeFilterParams {
  school: string;
  district: string;
}

export interface GradeRiskItem {
  grade: string;
  risk_percentage: number;
  student_count: number;
}

export interface SchoolRiskItem {
  school_id: string;
  school_name: string;
  risk_percentage: number;
  student_count: number;
  district_id?: string;
  district_name?: string;
}

export interface SchoolRiskResponse {
  schools: SchoolRiskItem[];
  total_schools: number;
  total_students: number;
  average_risk: number;
}

export interface GradeRiskResponse {
  grades: GradeRiskItem[];
  total_students: number;
  average_risk: number;
}

export interface ApiErrorResponse {
  detail?: string;
}

export interface ApiError extends Error {
  code?: string;
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    headers?: Record<string, any>;
  };
  request?: any;
  message: string;
  isAxiosError?: boolean;
}


class AlertsService {
  async getFilterOptions(): Promise<FilterOptionsResponse> {
    try {
      const response = await axiosInstance.get<FilterOptionsResponse>(
        "filter-options",
        { timeout: 60000 } // Increase timeout to 60 seconds for filter options
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching filter options:", error);
      const axiosError = error as ApiError;
      
      // Handle timeout specifically
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Request timed out while fetching filter options. The server is taking too long to respond.');
      }
      
      // Handle network errors
      if (!axiosError.response) {
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      // Handle server errors
      if (axiosError.response?.status === 503) {
        throw new Error('The server is currently unavailable. Please try again later.');
      }
      
      throw this.handleError(axiosError);
    }
  }


  async getSchoolsByDistrict(params: {
    district: string;
  }): Promise<SchoolOption[]> {
    try {
      const response = await axiosInstance.get<SchoolOption[]>(
        `schools/district/${params.district}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching schools for district:", error);
      throw this.handleError(error as ApiError);
    }
  }

  async getAllSchools(): Promise<SchoolOption[]> {
    try {
      const response = await axiosInstance.get<SchoolOption[]>(
        `schools/district/-1`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching all schools:", error);
      throw this.handleError(error as ApiError);
    }
  }
  
  async getGradesBySchool(params: {
    school: string;
    district: string;
  }): Promise<GradeOption[]> {
    try {
      console.log("Sending grades request with params:", params);

      const response = await axiosInstance.get<GradeOption[]>(
        `grades/district/${params.district}/school/${params.school}`
      );

      console.log("Received grades response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching grades for school:", error);
      throw this.handleError(error as ApiError);
    }
  }


  async getPredictionInsights(criteria: SearchCriteria): Promise<AnalysisData> {
    try {
      const response = await axiosInstance.post<AnalysisData>(
        "prediction-insights",
        criteria,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching prediction insights:", error);
      throw this.handleError(error as ApiError);
    }
  }

 
  async downloadReport(
    reportType: string,
    criteria: DownloadCriteria
  ): Promise<Blob> {
    try {
      const downloadCriteria: DownloadCriteria = {
        ...criteria,
        reportType: reportType,
      };

      const response = await axiosInstance.post(
        `download/report/${reportType}`,
        downloadCriteria,
        {
          responseType: "blob",
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error downloading ${reportType} report:`, error);
      throw this.handleError(error as ApiError);
    }
  }


  async downloadSummaryReport(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("summary", criteria);
  }

 
  async downloadDetailedReport(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("detailed", criteria);
  }


  async downloadBelow85Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("below_85", criteria);
  }

 
  async downloadTier1Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("tier1", criteria);
  }

 
  async downloadTier4Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("tier4", criteria);
  }

  async getSchoolRisks(districtId?: string): Promise<SchoolRiskResponse> {
    try {
      const url = districtId 
        ? `risks/schools?district=${encodeURIComponent(districtId)}`
        : 'risks/schools';
      
      const response = await axiosInstance.get<SchoolRiskResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching school risks:', error);
      throw this.handleError(error as ApiError);
    }
  }

  async getGradeRisks(districtId?: string, schoolId?: string): Promise<GradeRiskResponse> {
    try {
      const params = new URLSearchParams();
      
      if (districtId) params.append('district', districtId);
      if (schoolId) params.append('school', schoolId);
      
      const response = await axiosInstance.get<GradeRiskResponse>('/grade-risks', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching grade risks:', error);
      throw this.handleError(error as ApiError);
    }
  }

  private handleError(error: ApiError): Error {
    console.error('API Error:', error);
    let errorMessage = 'An unexpected error occurred';

    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.request) {
      errorMessage = "No response from server. Please check your connection.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Add more context to the error message
    if (error.response?.status) {
      errorMessage += ` (Status: ${error.response.status})`;
    }

    return new Error(errorMessage);
  }

 
  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }


  generateReportFilename(
    reportType: string,
    extension: string = "xlsx"
  ): string {
    const timestamp = new Date().toISOString().split("T")[0];
    return `attendance_${reportType}_${timestamp}.${extension}`;
  }
}


export const alertsService = new AlertsService();
export default alertsService;
