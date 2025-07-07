import axiosInstance from "@/lib/axios";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// ALERTS SERVICE CLASS
// ============================================================================

class AlertsService {
  /**
   * Fetches initial filter options (districts, schools, grades)
   */
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

  /**
   * Fetches schools for a specific district
   */
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

  /**
   * Fetches all schools (no district filter)
   */
  async getAllSchools(): Promise<SchoolOption[]> {
    try {
      const response = await axiosInstance.get<SchoolOption[]>(
        "schools"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching all schools:", error);
      throw this.handleError(error as ApiError);
    }
  }

  /**
   * Fetches grades for a specific school
   */
  /**
   * Fetches grades for a specific school
   */
  async getGradesBySchool(params: {
    school: string;
    district: string;
  }): Promise<GradeOption[]> {
    try {
      // Log the parameters being sent
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

  /**
   * Fetches AI-driven analysis and insights based on search criteria
   */
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

  /**
   * Downloads a report of specified type
   */
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

  /**
   * Downloads summary report
   */
  async downloadSummaryReport(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("summary", criteria);
  }

  /**
   * Downloads detailed report
   */
  async downloadDetailedReport(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("detailed", criteria);
  }

  /**
   * Downloads below 85% attendance report
   */
  async downloadBelow85Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("below_85", criteria);
  }

  /**
   * Downloads tier 1 students report
   */
  async downloadTier1Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("tier1", criteria);
  }

  /**
   * Downloads tier 4 students report
   */
  async downloadTier4Report(criteria: DownloadCriteria): Promise<Blob> {
    return this.downloadReport("tier4", criteria);
  }

  /**
   * Handles API errors and extracts user-friendly messages
   */
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

  /**
   * Utility method to trigger file download from blob
   */
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

  /**
   * Generates filename for report downloads
   */
  generateReportFilename(
    reportType: string,
    extension: string = "xlsx"
  ): string {
    const timestamp = new Date().toISOString().split("T")[0];
    return `attendance_${reportType}_${timestamp}.${extension}`;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const alertsService = new AlertsService();
export default alertsService;
