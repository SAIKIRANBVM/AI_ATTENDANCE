import axiosInstance from "@/lib/axios";
import { Student } from "@/types";

export interface FilterRequest {
  districtId?: number;
  locationID?: number;
  studentId?: number;
  grade?: number;
}

export interface AttendanceResponse {
  previousAttendance?: number;
  predictedAttendance?: number;
  predictedValues?: {
    year: string;
    predictedAttendance: number;
    totalDays: number;
  };
  metrics?: any[];
  trends?: any[];
  message?: string;
}

export interface InitialDataResponse {
  districts: { id: number; name: string }[];
  schools: { id: number; name: string; districtId: number }[];
  students: Student[];
}

class AttendanceService {
  async getInitialData(): Promise<InitialDataResponse> {
    const res = await axiosInstance.get("predictions/students");
    return {
      districts: res.data.districts ?? [],
      schools: res.data.schools ?? [],
      students: res.data.students ?? [],
    };
  }

  async getAllDistrictsData(): Promise<AttendanceResponse> {
    const res = await axiosInstance.get("predictions/all-districts");
    return res.data;
  }

  async getDistrictData(body: FilterRequest): Promise<AttendanceResponse> {
    const res = await axiosInstance.post("predictions/district", body);
    return res.data;
  }

  async getSchoolData(body: FilterRequest): Promise<AttendanceResponse> {
    const res = await axiosInstance.post("predictions/school", body);
    return res.data;
  }

  async getGradeData(body: FilterRequest): Promise<AttendanceResponse> {
    const res = await axiosInstance.post("predictions/grade-details", body);
    return res.data;
  }

  async getStudentData(body: FilterRequest): Promise<AttendanceResponse> {
    const res = await axiosInstance.post("predictions/student-details", body);
    return res.data;
  }
}

const attendanceService = new AttendanceService();
export default attendanceService;
