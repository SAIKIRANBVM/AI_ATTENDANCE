import { from, Observable } from "rxjs";
import axiosInstance from "../lib/axios";

interface FilterOptions {
  // Define the structure of filter options
  schools?: Array<{ id: string; name: string }>;
  grades?: string[];
  // Add other filter options as needed
}

interface AlertData {
  // Define the structure of alert data
  id: string;
  studentName: string;
  attendanceRate: number;
  tier: number;
  // Add other alert properties as needed
}

class AlertsService {
  constructor() {}

  // Get school districts for filtering
  getSchoolDistricts(): Observable<Array<{ id: string; name: string }>> {
    return from(
      axiosInstance
        .get("/api/v1/school-districts")
        .then((response) => response.data)
    );
  }

  // Get filter options for the dashboard
  getFilterOptions(): Observable<FilterOptions> {
    return from(
      axiosInstance
        .get("/api/v1/filter-options")
        .then((response) => response.data)
    );
  }

  // Get alerts based on filters
  getAlerts(
    filters: Record<string, any>
  ): Observable<{ data: AlertData[]; total: number }> {
    return from(
      axiosInstance
        .get("/api/v1/alerts", { params: filters })
        .then((response) => response.data)
    );
  }

  // Download below 85% report
  downloadBelow85Report(filters: Record<string, any>): Observable<Blob> {
    return from(
      axiosInstance
        .get("/api/v1/reports/below-85", {
          params: filters,
          responseType: "blob",
        })
        .then((response) => response.data)
    );
  }
}

export const alertsService = new AlertsService();
