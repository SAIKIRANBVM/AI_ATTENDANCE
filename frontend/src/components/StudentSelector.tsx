import React, { useMemo } from "react";
import { Student } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, X, Info } from "lucide-react";

interface Props {
  students: Student[];
  selectedStudent: Student | null;
  onSelect: (s: Student | null) => void;
  onFiltersChange: (filters: {
    district: number | null;
    school: number | null;
    grade: string | null;
    student: Student | null;
  }) => void;
  selectedDistrict: number | null;
  selectedSchool: number | null;
  selectedGrade: string | null;
}

const gradeOrder = [
  "Pre-Kindergarten",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

const getUniqueOptions = (
  students: Student[],
  getKey: (s: Student) => number,
  getName: (s: Student) => string
) =>
  Array.from(new Map(students.map((s) => [getKey(s), getName(s)])).entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const StudentSelector: React.FC<Props> = ({
  students,
  selectedStudent,
  onSelect,
  onFiltersChange,
  selectedDistrict,
  selectedSchool,
  selectedGrade,
}) => {
  const getDistrictName = (id: number) =>
    students.find((s) => s.districtId === id)?.districtName || "Unknown";
  const getSchoolName = (id: number) =>
    students.find((s) => s.locationId === id)?.schoolName || "Unknown";

  const {
    districtOptions,
    schoolOptions,
    availableGrades,
    filteredStudents,
    activeFiltersCount,
    currentApiLevel,
  } = useMemo(() => {
    const allDistricts = getUniqueOptions(
      students,
      (s) => s.districtId,
      (s) => s.districtName
    );
    const schoolsToShow = selectedDistrict
      ? students.filter((s) => s.districtId === selectedDistrict)
      : students;
    const availableSchools = getUniqueOptions(
      schoolsToShow,
      (s) => s.locationId,
      (s) => s.schoolName
    );

    let filteredByLocation = students;
    if (selectedDistrict && selectedSchool)
      filteredByLocation = students.filter(
        (s) =>
          s.districtId === selectedDistrict && s.locationId === selectedSchool
      );
    else if (selectedDistrict)
      filteredByLocation = students.filter(
        (s) => s.districtId === selectedDistrict
      );
    else if (selectedSchool)
      filteredByLocation = students.filter(
        (s) => s.locationId === selectedSchool
      );

    const finalFilteredStudents = selectedGrade
      ? filteredByLocation.filter((s) => s.grade === selectedGrade)
      : filteredByLocation;
    const grades = Array.from(
      new Set(filteredByLocation.map((s) => s.grade))
    ).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

    let apiLevel = "None";
    if (selectedStudent) apiLevel = "Student";
    else if (selectedGrade && (selectedDistrict || selectedSchool))
      apiLevel = "Grade";
    else if (selectedSchool) apiLevel = "School";
    else if (selectedDistrict) apiLevel = "District";

    return {
      districtOptions: allDistricts,
      schoolOptions: availableSchools,
      availableGrades: grades,
      filteredStudents: finalFilteredStudents.sort((a, b) => {
        if (a.schoolName !== b.schoolName)
          return a.schoolName.localeCompare(b.schoolName);
        const gA = gradeOrder.indexOf(a.grade);
        const gB = gradeOrder.indexOf(b.grade);
        if (gA !== gB) return gA - gB;
        return a.id.localeCompare(b.id);
      }),
      activeFiltersCount: [
        selectedDistrict,
        selectedSchool,
        selectedGrade,
        selectedStudent,
      ].filter(Boolean).length,
      currentApiLevel: apiLevel,
    };
  }, [
    students,
    selectedDistrict,
    selectedSchool,
    selectedGrade,
    selectedStudent,
  ]);

  const updateFilters = (
    updates: Partial<{
      district: number | null;
      school: number | null;
      grade: string | null;
      student: Student | null;
    }>
  ) => {
    const newFilters = {
      district:
        updates.district !== undefined ? updates.district : selectedDistrict,
      school: updates.school !== undefined ? updates.school : selectedSchool,
      grade: updates.grade !== undefined ? updates.grade : selectedGrade,
      student:
        updates.student !== undefined ? updates.student : selectedStudent,
    };
    onFiltersChange(newFilters);
    if (updates.student !== undefined) onSelect(newFilters.student);
  };

  const clearAllFilters = () =>
    updateFilters({ district: null, school: null, grade: null, student: null });
  const handleDistrictSelect = (districtId: number | null) =>
    updateFilters(
      districtId
        ? { district: districtId, school: null, grade: null, student: null }
        : { district: null }
    );
  const handleSchoolSelect = (schoolId: number | null) =>
    updateFilters(
      schoolId
        ? { school: schoolId, grade: null, student: null }
        : { school: null, grade: null, student: null }
    );

  const IdDropdown = ({
    label,
    selectedId,
    placeholder,
    options,
    onSelect,
    disabled = false,
    disabledReason,
  }: {
    label: string;
    selectedId: number | null;
    placeholder: string;
    options: { id: number; name: string }[];
    onSelect: (id: number | null) => void;
    disabled?: boolean;
    disabledReason?: string;
  }) => {
    const selectedName = selectedId
      ? options.find((opt) => opt.id === selectedId)?.name
      : null;
    return (
      <div className="space-y-2">
        <label
          className={`block text-base font-semibold ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {label}
          {disabled && disabledReason && (
            <span className="ml-2 text-xs text-gray-500">{`(${disabledReason})`}</span>
          )}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={`w-full justify-between text-base font-normal h-10 bg-white border-[#C0D5DE] border-[1.6px] ${
                selectedId ? "ring-2 ring-blue-200 border-blue-300" : ""
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="truncate">{selectedName || placeholder}</span>
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {!disabled && (
            <DropdownMenuContent className="max-h-60 overflow-y-auto w-full min-w-[240px]">
              <DropdownMenuItem onClick={() => onSelect(null)} className="text-base py-2 cursor-pointer text-gray-500">
                <div className="flex items-center w-full">
                  <span className="mr-2 w-4">
                    {!selectedId && <Check className="h-4 w-4" />}
                  </span>
                  {`All ${label}s`}
                </div>
              </DropdownMenuItem>
              {options.length === 0 ? (
                <DropdownMenuItem disabled className="text-base py-2">
                  {`No ${label.toLowerCase()}s available`}
                </DropdownMenuItem>
              ) : (
                options.map(option => (
                  <DropdownMenuItem key={option.id} onClick={() => onSelect(option.id)} className="text-base py-2 cursor-pointer">
                    <div className="flex items-center w-full">
                      <span className="mr-2 w-4">
                        {selectedId === option.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </span>
                      {option.name}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    )
  }

  const GradeDropdown = () => (
    <div className="space-y-2">
      <label className={`block text-base font-semibold ${!selectedDistrict && !selectedSchool ? "text-gray-400" : "text-gray-700"}`}>Grade{!selectedDistrict && !selectedSchool && <span className="ml-2 text-xs text-gray-500">(Select district or school first)</span>}</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!selectedDistrict && !selectedSchool} className={`w-full justify-between text-base font-normal h-10 bg-white border-[#C0D5DE] border-[1.6px] ${selectedGrade ? "ring-2 ring-blue-200 border-blue-300" : ""} ${!selectedDistrict && !selectedSchool ? "opacity-50 cursor-not-allowed" : ""}`}>
            <span className="truncate">{selectedGrade || "Select grade"}</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        {(selectedDistrict || selectedSchool) && (
          <DropdownMenuContent className="max-h-60 overflow-y-auto w-full min-w-[240px]">
            <DropdownMenuItem onClick={() => updateFilters({ grade: null, student: null })} className="text-base py-2 cursor-pointer text-gray-500">
              <div className="flex items-center w-full">
                <span className="mr-2 w-4">{!selectedGrade && <Check className="h-4 w-4" />}</span>
                All Grades
              </div>
            </DropdownMenuItem>
            {availableGrades.map(grade => (
              <DropdownMenuItem key={grade} onClick={() => updateFilters({ grade, student: null })} className="text-base py-2 cursor-pointer">
                <div className="flex items-center w-full">
                  <span className="mr-2 w-4">{selectedGrade === grade && <Check className="h-4 w-4" />}</span>
                  {grade}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  )

  const StudentDropdown = () => {
    const disabled = !selectedDistrict || !selectedSchool || !selectedGrade
    return (
      <div className="space-y-2">
        <label className={`block text-base font-semibold ${disabled ? "text-gray-400" : "text-gray-700"}`}>Student{disabled && <span className="ml-2 text-xs text-gray-500">(Select district, school, and grade first)</span>}</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled} className={`w-full justify-between text-base font-normal h-10 bg-white border-[#C0D5DE] border-[1.6px] ${selectedStudent ? "ring-2 ring-blue-200 border-blue-300" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className="truncate">{selectedStudent ? `${selectedStudent.id} (${selectedStudent.grade})` : "Select student"}</span>
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {!disabled && filteredStudents.length > 0 && (
            <DropdownMenuContent className="max-h-60 overflow-y-auto w-full min-w-[280px]">
              <DropdownMenuItem onClick={() => updateFilters({ student: null })} className="text-base py-2 cursor-pointer text-gray-500">
                <div className="flex items-center w-full">
                  <span className="mr-2 w-4">{!selectedStudent && <Check className="h-4 w-4" />}</span>
                  No specific student
                </div>
              </DropdownMenuItem>
              {filteredStudents.map(student => (
                <DropdownMenuItem key={student.id} onClick={() => updateFilters({ student })} className="text-base py-2 cursor-pointer">
                  <div className="flex items-center w-full">
                    <span className="mr-2 w-4">{selectedStudent?.id === student.id && <Check className="h-4 w-4" />}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{student.id}</span>
                      <span className="text-xs text-gray-500">{`${student.grade} • ${student.schoolName}`}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeFiltersCount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{`${activeFiltersCount} filter${
            activeFiltersCount > 1 ? "s" : ""
          } active`}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      )}
      <div className="space-y-4">
        <IdDropdown
          label="District"
          selectedId={selectedDistrict}
          placeholder="Select district"
          options={districtOptions}
          onSelect={handleDistrictSelect}
        />
        <IdDropdown
          label="School"
          selectedId={selectedSchool}
          placeholder="Select school"
          options={schoolOptions}
          onSelect={handleSchoolSelect}
        />
        <GradeDropdown />
        <StudentDropdown />
      </div>
    </div>
  );
};
