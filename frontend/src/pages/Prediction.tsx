import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Student } from "@/types";
import { StudentSelector } from "@/components/StudentSelector";
import { AttendanceTrend } from "@/components/AttendanceTrend";
import { AttendanceHistory } from "@/components/AttendanceHistory";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { setAuthToken } from "@/lib/axios";
import attendanceService, {
  AttendanceResponse,
  FilterRequest,
} from "@/services/prediction.service";

interface Filters {
  district: number | null;
  school: number | null;
  grade: string | null;
  student: Student | null;
}

const gradeStringToNumber = (gradeStr: string): number => {
  if (gradeStr === "Pre-Kindergarten") return -1;
  if (gradeStr === "Kindergarten") return 0;
  const m = gradeStr.match(/^(\d+)/);
  return m ? parseInt(m[1]) : -3;
};

const Prediction: React.FC = () => {
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>(
    []
  );
  const [schools, setSchools] = useState<
    { id: number; name: string; districtId: number }[]
  >([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] =
    useState<AttendanceResponse | null>(null);
  const [filters, setFilters] = useState<Filters>({
    district: null,
    school: null,
    grade: null,
    student: null,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const { token, ready } = useAuth();
  console.log(`The token value in prediction.tsx file: ${token}`)

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        const data = await attendanceService.getInitialData();
        setDistricts(data.districts);
        setSchools(data.schools);
        setStudents(data.students);
      } finally {
        setIsInitialLoading(false);
      }
    };
    if (!ready) return; 
    fetchInitialData();
  }, [ready]);

  const fetchData = useCallback(async () => {
    if (isInitialLoading) return;
    setIsDataLoading(true);

    try {
      const { district, school, grade, student } = filters;

      if (!district && !school && !grade && !student) {
        const data = await attendanceService.getAllDistrictsData();
        setAttendanceData(data.message ? null : data);
        return;
      }

      const body: FilterRequest = {};
      if (district) body.districtId = district;
      if (school) body.locationID = school;
      if (grade) {
        const g = gradeStringToNumber(grade);
        if (g !== -3) body.grade = g;
      }
      if (student) body.studentId = parseInt(student.id);

      let data: AttendanceResponse;
      if (student) data = await attendanceService.getStudentData(body);
      else if (grade && (district || school))
        data = await attendanceService.getGradeData(body);
      else if (school) data = await attendanceService.getSchoolData(body);
      else if (district) data = await attendanceService.getDistrictData(body);
      else data = await attendanceService.getAllDistrictsData();

      setAttendanceData(data.message ? null : data);
    } finally {
      setIsDataLoading(false);
    }
  }, [filters, isInitialLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processed = useMemo(() => {
    if (!attendanceData) return { history: [], trend: [], pred: null };

    const history =
      attendanceData.metrics?.map((m: any) => ({
        year: parseInt(m.year),
        attendanceRate: m.attendanceRate,
        unexcused: m.unexcused,
        present: m.present,
        total: m.total,
      })) ?? [];

    const pv = attendanceData.predictedValues;
    const pred = pv
      ? {
          year: parseInt(pv.year),
          attendanceRate: pv.predictedAttendance,
          total: pv.totalDays ? Math.floor(pv.totalDays) : pv.totalDays,
        }
      : null;

    const trend =
      attendanceData.trends?.map((t: any) => ({
        year: parseInt(t.year),
        value: t.value,
        isPredicted: t.isPredicted,
      })) ?? [];
    return { history, trend, pred };
  }, [attendanceData]);

  const curr = processed.history.at(-1) ?? null;
  const prev = processed.history.at(-2) ?? null;

  const MetricCard = ({
    title,
    value,
    comparison,
    comparisonYear,
  }: {
    title: string;
    value: string;
    comparison?: number;
    comparisonYear?: number;
  }) => (
    <Card className="bg-white border border-[#C0D5DE] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="flex items-center">
            <CalendarCheck2 className="h-5 w-5 text-[#03787c] mr-2" />
            <div className="text-3xl font-bold">{value}</div>
          </div>
          <div className="text-right">
            {comparison !== undefined && comparisonYear ? (
              <>
                <div
                  className={`font-semibold ${
                    comparison >= 0 ? "text-[#03787c]" : "text-red-600"
                  }`}
                >
                  {`${comparison >= 0 ? "▲" : "▼"}${Math.abs(
                    comparison
                  ).toFixed(1)}%`}
                </div>
                <p className="text-xs text-gray-500">{`vs ${comparisonYear}`}</p>
              </>
            ) : (
              <div className="text-sm">N/A</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <header className="w-full bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              AI-Driven Attendance Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Track and analyze student attendance patterns
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#03787c] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Loading Application
            </h2>
            <p className="text-gray-500">
              Fetching districts, schools, and students...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            AI-Driven Attendance Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Track and analyze student attendance patterns
          </p>
        </div>
      </header>

      <div className="w-full flex">
        <aside className="bg-white border-r border-[#C0D5DE] shadow-sm w-80 h-[calc(100vh-73px)] sticky top-[73px] p-5">
          <StudentSelector
            students={students}
            selectedStudent={filters.student}
            onSelect={(s) => setFilters((p) => ({ ...p, student: s }))}
            onFiltersChange={setFilters}
            selectedDistrict={filters.district}
            selectedSchool={filters.school}
            selectedGrade={filters.grade}
          />
        </aside>

        <main className="flex-1 p-6 bg-gray-50 relative">
          {isDataLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#03787c] mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Loading attendance data...
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Attendance Rate (2024)"
              value={
                attendanceData?.previousAttendance != null
                  ? `${attendanceData.previousAttendance}%`
                  : "--"
              }
              comparison={
                curr && prev
                  ? curr.attendanceRate - prev.attendanceRate
                  : undefined
              }
              comparisonYear={prev?.year}
            />

            <MetricCard
              title="AI Predicted Attendance (2025)"
              value={
                attendanceData?.predictedValues
                  ? `${attendanceData.predictedValues.predictedAttendance}%`
                  : "--"
              }
              comparison={
                attendanceData?.predictedValues && curr
                  ? attendanceData.predictedValues.predictedAttendance -
                    curr.attendanceRate
                  : undefined
              }
              comparisonYear={curr?.year}
            />

            <MetricCard
              title="Chronic Absence Rate"
              value={
                attendanceData?.chronicAbsenceRate
                  ? `${attendanceData.chronicAbsenceRate}%`
                  : "--"
              }
            />
          </div>

          {processed.trend.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Attendance Trend</h3>
              <AttendanceTrend data={processed.trend} />
            </div>
          )}

          {processed.history.length > 0 && processed.pred && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Attendance History</h3>
              <AttendanceHistory
                history={processed.history}
                predicted={processed.pred}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Prediction;
