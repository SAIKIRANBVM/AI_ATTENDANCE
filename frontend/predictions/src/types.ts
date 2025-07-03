export interface AttendanceData {
  year: string;
  attendanceRate: number | null;
  unexcused: number | null;
  present: number | null;
  total: number | null;
  lates?: number | null;
  isPredicted?: boolean;
}

export interface Student {
  id: string;
  grade: string;
  schoolName: string;
  districtName: string;
  districtId: number;
  locationId: number;
}

export interface RiskCategory {
  level: 'Low' | 'Medium' | 'High';
  color: string;
  description: string;
}
