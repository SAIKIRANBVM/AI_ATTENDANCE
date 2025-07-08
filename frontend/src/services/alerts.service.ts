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
  total_students: number;
  below_85_students: number;
  tier1_students: number;
  tier4_students: number;
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
  summary_statistics: SummaryStatistics;
  key_insights: Array<string | InsightItem>;
  recommendations: Array<string | RecommendationItem>;
}

export interface FilterOptionsResponse {
  districts: DistrictOption[];
  schools: SchoolOption[];
  grades: GradeOption[];
}

export interface SearchCriteria {
  district_code?: string;
  grade_code?: string;
  school_code?: string;
  student_id?: string;
}

export interface DownloadCriteria extends SearchCriteria {
  report_type?: string;
}

export interface SchoolFilterParams {
  district: string;
}

export interface GradeFilterParams {
  school: string;
  district: string;
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


class AlertsService {
  async getFilterOptions(): Promise<FilterOptionsResponse> {
    try {
      const response = await axiosInstance.get<FilterOptionsResponse>(
        "filter-options"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching filter options:", error);
      throw this.handleError(error as ApiError);
    }
  }


  async getSchoolsByDistrict(params: {
    district: string;
  }): Promise<SchoolOption[]> {
    try {
      const response = await axiosInstance.get<SchoolOption[]>(
        "schools",
        {
          params: { district_code: params.district },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching schools for district:", error);
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
        "grades",
        {
          params: {
            school_code: params.school,
            district_code: params.district,
          },
        }
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
        report_type: reportType,
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


  private handleError(error: ApiError): Error {
    let message = "An unexpected error occurred";

    if (error.response) {
      if (error.response.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response.status === 404) {
        message = "No data found for the selected filters.";
      } else if (error.response.status === 503) {
        message = "Server is still initializing. Please try again in a moment.";
      } else {
        message = `Server error: ${error.response.status}`;
      }
    } else if (error.request) {
      message = "No response from server. Please check your connection.";
    } else if (error.message) {
      message = `Request error: ${error.message}`;
    }

    return new Error(message);
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
