import React, { useState } from "react";
import { AlertCircle, BarChart3, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GradeRiskItem, DistrictSchoolRisk } from "../types/dashboard-types";
import { AIProcessingAnimation } from "./ui-components";

// Enhanced Grade Risk Table Component with sorting and better layout
export const GradeRiskTable: React.FC<{
  gradeRisks: GradeRiskItem[];
  isLoading: boolean;
  error: string | null;
  district: string;
  school: string;
  selectedSchool?: string | null;
  isGlobalView?: boolean;
  gradeFilter?: string;
}> = ({
  gradeRisks,
  isLoading,
  error,
  district,
  school,
  selectedSchool,
  isGlobalView = false,
  gradeFilter,
}) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use gradeFilter prop instead of state
  const filteredGrades = gradeFilter
    ? gradeRisks.filter((g) => g.grade.toString() === gradeFilter)
    : gradeRisks;

  // Sort grades in proper order (PK, K, 1, 2, etc.)
  const sortedGrades = [...filteredGrades].sort((a, b) => {
    const gradeA = a.grade.toString().toLowerCase();
    const gradeB = b.grade.toString().toLowerCase();

    // Handle special cases
    if (gradeA === "pk" && gradeB !== "pk") return sortOrder === "asc" ? -1 : 1;
    if (gradeB === "pk" && gradeA !== "pk") return sortOrder === "asc" ? 1 : -1;
    if (gradeA === "k" && gradeB !== "k" && gradeB !== "pk")
      return sortOrder === "asc" ? -1 : 1;
    if (gradeB === "k" && gradeA !== "k" && gradeA !== "pk")
      return sortOrder === "asc" ? 1 : -1;

    // Handle numeric grades
    const numA = Number.parseInt(gradeA);
    const numB = Number.parseInt(gradeB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortOrder === "asc" ? numA - numB : numB - numA;
    }

    // Fallback to string comparison
    return sortOrder === "asc"
      ? gradeA.localeCompare(gradeB)
      : gradeB.localeCompare(gradeA);
  });

  const totalPages = Math.ceil(sortedGrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGrades = sortedGrades.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const totalStudents = filteredGrades.reduce(
    (sum, item) => sum + item.student_count,
    0
  );
  const averageRisk =
    filteredGrades.length > 0
      ? filteredGrades.reduce((sum, item) => sum + item.risk_percentage, 0) /
        filteredGrades.length
      : 0;

  const getRiskLevel = (risk: number) => {
    if (risk >= 30)
      return {
        level: "Critical",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    if (risk >= 20)
      return {
        level: "High",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      };
    if (risk >= 10)
      return {
        level: "Medium",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    return {
      level: "Low",
      color: "bg-green-100 text-green-800 border-green-200",
    };
  };

  const getRiskBarColor = (risk: number) => {
    if (risk >= 30) return "bg-red-500";
    if (risk >= 20) return "bg-orange-500";
    if (risk >= 10) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getContextTitle = () => {
    if (selectedSchool) return `Grade Level Risk Analysis - ${selectedSchool}`;
    if (school) return `Grade Level Risk Analysis - ${school}`;
    if (district) return `Grade Level Risk Analysis - ${district}`;
    if (isGlobalView) return "Grade Level Risk Analysis - All Grades";
    return "Grade Level Risk Analysis";
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            📊 {getContextTitle()}
          </CardTitle>
          {(district || school || selectedSchool || isGlobalView) && (
            <div className="text-xs text-blue-100">
              {selectedSchool || school || district || "Global View"}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <AIProcessingAnimation
              isProcessing={true}
              message="Loading grade risk data..."
              type="loading"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Error loading grade risks: {error}
              </span>
            </div>
          </div>
        )}

        {!isLoading && !error && gradeRisks.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-l-4 border-blue-400 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">
                    {totalStudents.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-orange-400 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Average Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">
                    {averageRisk.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="text-xs"
                >
                  Sort by Grade{" "}
                  {sortOrder === "asc" ? (
                    <ArrowUp className="w-3 h-3 ml-1" />
                  ) : (
                    <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1}-
                {Math.min(startIndex + itemsPerPage, sortedGrades.length)} of{" "}
                {sortedGrades.length} grades
              </div>
            </div>

            {/* Grade Risk Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade Level
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Percentage
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedGrades.map((gradeRisk, index) => {
                    const riskInfo = getRiskLevel(gradeRisk.risk_percentage);
                    return (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          Grade {gradeRisk.grade}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getRiskBarColor(
                                  gradeRisk.risk_percentage
                                )}`}
                                style={{
                                  width: `${Math.min(
                                    gradeRisk.risk_percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {gradeRisk.risk_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${riskInfo.color}`}
                          >
                            {riskInfo.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                          {gradeRisk.student_count.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && gradeRisks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              {selectedSchool
                ? `No grade risk data available for ${selectedSchool}`
                : school
                ? `No grade risk data available for ${school}`
                : district
                ? `Select a school to view grade-level analysis`
                : isGlobalView
                ? "No grade risk data available"
                : "Select a district or school to view grade-level risks"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// New District Schools Risk Table Component
export const DistrictSchoolsRiskTable: React.FC<{
  districtSchoolRisks: DistrictSchoolRisk[];
  isLoading: boolean;
  error: string | null;
  district: string;
  isGlobalView?: boolean;
  onSchoolClick: (schoolName: string) => void;
}> = ({
  districtSchoolRisks,
  isLoading,
  error,
  district,
  isGlobalView = false,
  onSchoolClick,
}) => {
  const [sortField, setSortField] = useState<
    "riskPercentage" | "schoolName" | "studentCount"
  >("riskPercentage");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  // Filter schools based on search term
  const filteredSchools = districtSchoolRisks.filter((school) =>
    school.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Always show table if there is data
  const shouldShowTable = filteredSchools.length > 0;

  // Sort schools
  const sortedSchools = [...filteredSchools].sort((a, b) => {
    let aValue, bValue;

    switch (sortField) {
      case "riskPercentage":
        aValue = a.riskPercentage;
        bValue = b.riskPercentage;
        break;
      case "studentCount":
        aValue = a.studentCount;
        bValue = b.studentCount;
        break;
      case "schoolName":
      default:
        aValue = a.schoolName.toLowerCase();
        bValue = b.schoolName.toLowerCase();
        break;
    }

    if (typeof aValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    } else {
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  const totalPages = Math.ceil(sortedSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSchools = sortedSchools.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (
    field: "riskPercentage" | "schoolName" | "studentCount"
  ) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "riskPercentage" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const getRiskBarColor = (risk: number) => {
    if (risk >= 30) return "bg-red-500";
    if (risk >= 20) return "bg-orange-500";
    if (risk >= 10) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getContextTitle = () => {
    if (district) return `District Schools Risk Analysis - ${district}`;
    if (isGlobalView) return "District Schools Risk Analysis - All Schools";
    return "District Schools Risk Analysis";
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            🏫 {getContextTitle()}
          </CardTitle>
          {(district || isGlobalView) && (
            <div className="text-xs text-blue-100">
              {district || "Global View"}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <AIProcessingAnimation
              isProcessing={true}
              message="Loading school risk data..."
              type="loading"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Error loading school risks: {error}
              </span>
            </div>
          </div>
        )}

        {shouldShowTable ? (
          <>
            {/* Search and Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1}-
                {Math.min(startIndex + itemsPerPage, sortedSchools.length)} of{" "}
                {sortedSchools.length} schools
                {searchTerm && ` (filtered from ${districtSchoolRisks.length})`}
              </div>
            </div>

            {/* Schools Risk Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("schoolName")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>School Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("riskPercentage")}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Risk Percentage</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("studentCount")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Students</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSchools.map((school, index) => (
                    <tr
                      key={index}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-blue-50 cursor-pointer transition-colors`}
                      onClick={() => onSchoolClick(school.schoolName)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                        {school.schoolName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getRiskBarColor(
                                school.riskPercentage
                              )}`}
                              style={{
                                width: `${Math.min(
                                  school.riskPercentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {school.riskPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(
                            school.riskLevel
                          )}`}
                        >
                          {school.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                        {school.studentCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              No schools found for the selected district or school.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
