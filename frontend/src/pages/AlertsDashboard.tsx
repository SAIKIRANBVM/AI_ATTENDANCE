// This is a placeholder. The actual modularization will be performed in the next steps by creating and moving code to the new files as described.
"use client"

import React, { useState, useEffect, useReducer, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import {
  Globe,
  AlertCircle,
  Download,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Brain,
  BarChart3,
  Target,
  Sparkles,
  Activity,
  Loader2,
  Play,
  Pause,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"
import { setAuthToken } from "@/lib/axios"
import alertsService, { type GradeRiskResponse } from "@/services/alerts.service"
import { toast, Toaster } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// All existing interfaces remain exactly the same
interface DistrictOption {
  value: string
  label: string
}

interface SchoolOption {
  value: string
  label: string
  district?: string
  location_id?: string
  key?: string
}

interface GradeOption {
  value: string
  label: string
  school?: string
  district?: string
}

interface SummaryStatistics {
  totalStudents: number
  below85Students: number
  tier1Students: number
  tier2Students: number
  tier3Students: number
  tier4Students: number
}

interface InsightItem {
  text?: string
  insight?: string
}

interface RecommendationItem {
  text?: string
  recommendation?: string
}

interface PrioritySchool {
  schoolName: string
  district: string
  riskPercentage: number
  studentCount?: number
  SCHOOL_NAME?: string
  DISTRICT_NAME?: string
}

interface GradeRisk {
  grade: string | number
  grade_level?: number
  count: number
  riskPercentage?: number
}

interface AnalysisData {
  summaryStatistics: SummaryStatistics
  keyInsights: Array<string | InsightItem>
  recommendations: Array<string | RecommendationItem>
  alertsNotifications?: {
    totalBelow60: number
    byDistrict: Array<{ district: string; count: number }>
    bySchool: Array<{ school: string; count: number }>
    byGrade: GradeRisk[]
  }
  totalBelow60?: number
  byDistrict?: Array<{ district: string; count: number }>
  bySchool?: Array<{ school: string; count: number }>
  byGrade?: GradeRisk[]
}

interface ApiErrorResponse {
  detail?: string
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse
    status?: number
    headers?: Record<string, any>
  }
  request?: any
  message?: string
}

interface SearchCriteria {
  districtCode?: string
  gradeCode?: string
  schoolCode?: string
}

interface DownloadCriteria extends SearchCriteria {
  reportType?: string
}

interface FilterState {
  district: string
  school: string
  grade: string
}

interface OptionsState {
  districtOptions: DistrictOption[]
  schoolOptions: SchoolOption[]
  gradeOptions: GradeOption[]
  allSchoolOptions: SchoolOption[]
}

interface LoadingState {
  isLoading: boolean
  isInitialLoad: boolean
  isDownloadingReport: boolean
  isProcessingAI: boolean
  isLoadingGradeRisks: boolean
}

interface ErrorState {
  generalError: string | null
  downloadError: string | null
  gradeRiskError: string | null
}

interface UIState {
  isGlobalView: boolean
  showFilters: boolean
  notificationsEnabled: boolean
}

interface GradeRiskItem {
  grade: string
  risk_percentage: number
  student_count: number
}

interface DistrictSchoolRisk {
  schoolName: string
  riskPercentage: number
  riskLevel: "Critical" | "High" | "Medium" | "Low"
  studentCount: number
  district: string
}

interface AppState {
  filters: FilterState
  options: OptionsState
  loading: LoadingState
  errors: ErrorState
  ui: UIState
  analysisData: AnalysisData | null
  loadTimer: NodeJS.Timeout | null
  gradeRisks: GradeRiskItem[]
  districtSchoolRisks: DistrictSchoolRisk[]
  selectedSchoolForGrades: string | null
  fullDistrictSchoolList: SchoolOption[] // NEW: stores all schools for selected district
}

interface SimulationState {
  tier1Improvement: number
  tier2Improvement: number
  tier3Improvement: number
  tier4Improvement: number
  isProcessing: boolean
  isExpanded: boolean
}

interface ProjectedOutcome {
  tier: number
  currentStudents: number
  improvedStudents: number
  improvementPercentage: number
  strategyImpact?: number
  projectedStudents: number
}

interface ComparisonData {
  name: string
  current: number
  projected: number
  color: string
}

type AppAction =
  | { type: "SET_FILTER"; payload: { field: keyof FilterState; value: string } }
  | { type: "RESET_FILTERS" }
  | { type: "SET_OPTIONS"; payload: Partial<OptionsState> }
  | { type: "SET_LOADING"; payload: Partial<LoadingState> }
  | { type: "SET_ERROR"; payload: Partial<ErrorState> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_UI"; payload: Partial<UIState> }
  | { type: "SET_ANALYSIS_DATA"; payload: AnalysisData | null }
  | { type: "SET_LOAD_TIMER"; payload: NodeJS.Timeout | null }
  | { type: "SET_GRADE_RISKS"; payload: GradeRiskItem[] }
  | { type: "SET_GRADE_RISKS_LOADING"; payload: boolean }
  | { type: "SET_GRADE_RISKS_ERROR"; payload: string | null }
  | { type: "SET_DISTRICT_SCHOOL_RISKS"; payload: DistrictSchoolRisk[] }
  | { type: "SET_SELECTED_SCHOOL_FOR_GRADES"; payload: string | null }
  | { type: "SET_FULL_DISTRICT_SCHOOL_LIST"; payload: SchoolOption[] } // NEW

const initialState: AppState = {
  filters: { district: "", school: "", grade: "" },
  options: {
    districtOptions: [],
    schoolOptions: [],
    gradeOptions: [],
    allSchoolOptions: [],
  },
  loading: {
    isLoading: true,
    isInitialLoad: true,
    isDownloadingReport: false,
    isProcessingAI: false,
    isLoadingGradeRisks: false,
  },
  errors: {
    generalError: null,
    downloadError: null,
    gradeRiskError: null,
  },
  ui: {
    isGlobalView: false,
    showFilters: true,
    notificationsEnabled: true,
  },
  analysisData: null,
  loadTimer: null,
  gradeRisks: [],
  districtSchoolRisks: [],
  selectedSchoolForGrades: null,
  fullDistrictSchoolList: [], // NEW
}

interface AlertNotification {
  id: string
  title: string
  description: string
  type: "info" | "warning" | "success" | "error"
  timestamp: Date
  isCritical?: boolean
}

interface NotificationTemplate {
  id: string
  title: string
  description: (data: AnalysisData) => string
  type: "info" | "warning" | "success" | "error"
  isCritical?: boolean
}

interface CategorizedInsight {
  category: string
  icon: string
  color: string
  items: Array<{
    text: string
    confidence: number
    priority: "HIGH" | "MEDIUM" | "LOW"
  }>
}

interface CategorizedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW"
  icon: string
  color: string
  items: Array<{
    text: string
    confidence: number
  }>
}

// Enhanced AI Processing Animation Component
const AIProcessingAnimation: React.FC<{
  isProcessing: boolean
  message?: string
  type?: "loading" | "downloading" | "processing"
}> = ({ isProcessing, message = "Processing", type = "processing" }) => {
  if (!isProcessing) return null

  const getIcon = () => {
    switch (type) {
      case "downloading":
        return <Download className="w-4 h-4 text-blue-600 animate-bounce" />
      case "loading":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case "downloading":
        return "Generating Report"
      case "loading":
        return "Loading Dashboard"
      default:
        return "AI Processing"
    }
  }

  return (
    <div className="flex items-center justify-center space-x-3 py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse"></div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-sm font-semibold text-blue-700">{getMessage()}</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">{message}</div>
      </div>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
      </div>
    </div>
  )
}

// AI-powered intervention strategies with historical success rates
const AI_STRATEGIES = {
  tier1: [
    {
      name: "Early Intervention",
      successRate: 0.85,
      description: "Proactive support for at-risk students",
    },
    {
      name: "Parent Engagement",
      successRate: 0.75,
      description: "Increased communication with parents",
    },
  ],
  tier2: [
    {
      name: "Mentorship Program",
      successRate: 0.7,
      description: "Peer or teacher mentorship",
    },
    {
      name: "Attendance Contracts",
      successRate: 0.65,
      description: "Formal agreements with students",
    },
  ],
  tier3: [
    {
      name: "Counseling Services",
      successRate: 0.6,
      description: "Professional support services",
    },
    {
      name: "Personalized Learning",
      successRate: 0.55,
      description: "Tailored educational plans",
    },
  ],
  tier4: [
    {
      name: "Case Management",
      successRate: 0.5,
      description: "Intensive one-on-one support",
    },
    {
      name: "Community Resources",
      successRate: 0.45,
      description: "External support services",
    },
  ],
}

// Custom label component for pie chart
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (value === 0 || value < 1) return null

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="500"
    >
      {`${name}: ${value > 0 ? value.toLocaleString() : "0"}`}
    </text>
  )
}

// Notification Toggle Component
const NotificationToggle: React.FC<{
  enabled: boolean
  onToggle: (enabled: boolean) => void
  notifications: AlertNotification[]
  onClearHistory: () => void
}> = ({ enabled, onToggle, notifications, onClearHistory }) => {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.isCritical).length

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{enabled ? "On" : "Off"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(!enabled)}
                className={`text-xs ${enabled ? "text-green-600" : "text-gray-400"}`}
              >
                {enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications
              .slice(-5)
              .reverse()
              .map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex-col items-start p-3">
                  <div className="flex items-start w-full">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 mr-2 ${
                        notification.type === "error"
                          ? "bg-red-500"
                          : notification.type === "warning"
                            ? "bg-yellow-500"
                            : notification.type === "success"
                              ? "bg-green-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{notification.description}</div>
                      <div className="text-xs text-gray-400 mt-1">{notification.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-sm text-gray-500">No notifications</span>
            </DropdownMenuItem>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearHistory} className="text-center">
              <span className="text-sm text-gray-500">Clear History</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Global Risk Overview Card Component
const GlobalRiskOverviewCard: React.FC<{ analysisData: AnalysisData }> = ({ analysisData }) => {
  const totalStudents = analysisData.summaryStatistics.totalStudents
  const atRiskStudents = analysisData.summaryStatistics.tier4Students + analysisData.summaryStatistics.tier3Students
  const riskPercentage = totalStudents > 0 ? (atRiskStudents / totalStudents) * 100 : 0

  const getRiskLevel = (percentage: number) => {
    if (percentage >= 30) return { level: "Critical", color: "bg-red-100 text-red-800 border-red-200" }
    if (percentage >= 20) return { level: "High", color: "bg-orange-100 text-orange-800 border-orange-200" }
    if (percentage >= 10) return { level: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" }
    return { level: "Low", color: "bg-green-100 text-green-800 border-green-200" }
  }

  const riskInfo = getRiskLevel(riskPercentage)

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
      <CardHeader className="bg-[#03787c] text-white">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Global Risk Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{totalStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{atRiskStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">At-Risk Students</div>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${riskInfo.color}`}
            >
              {riskInfo.level} Risk ({riskPercentage.toFixed(1)}%)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced Grade Risk Table Component with sorting and better layout
const GradeRiskTable: React.FC<{
  gradeRisks: GradeRiskItem[]
  isLoading: boolean
  error: string | null
  district: string
  school: string
  selectedSchool?: string | null
  isGlobalView?: boolean
  gradeFilter?: string
}> = ({ gradeRisks, isLoading, error, district, school, selectedSchool, isGlobalView = false, gradeFilter }) => {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Use gradeFilter prop instead of state
  const filteredGrades = gradeFilter
    ? gradeRisks.filter((g) => g.grade.toString() === gradeFilter)
    : gradeRisks

  // Sort grades in proper order (PK, K, 1, 2, etc.)
  const sortedGrades = [...filteredGrades].sort((a, b) => {
    const gradeA = a.grade.toString().toLowerCase()
    const gradeB = b.grade.toString().toLowerCase()

    // Handle special cases
    if (gradeA === "pk" && gradeB !== "pk") return sortOrder === "asc" ? -1 : 1
    if (gradeB === "pk" && gradeA !== "pk") return sortOrder === "asc" ? 1 : -1
    if (gradeA === "k" && gradeB !== "k" && gradeB !== "pk") return sortOrder === "asc" ? -1 : 1
    if (gradeB === "k" && gradeA !== "k" && gradeA !== "pk") return sortOrder === "asc" ? 1 : -1

    // Handle numeric grades
    const numA = Number.parseInt(gradeA)
    const numB = Number.parseInt(gradeB)
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortOrder === "asc" ? numA - numB : numB - numA
    }

    // Fallback to string comparison
    return sortOrder === "asc" ? gradeA.localeCompare(gradeB) : gradeB.localeCompare(gradeA)
  })

  const totalPages = Math.ceil(sortedGrades.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedGrades = sortedGrades.slice(startIndex, startIndex + itemsPerPage)

  const totalStudents = filteredGrades.reduce((sum, item) => sum + item.student_count, 0)
  const averageRisk = filteredGrades.length > 0
    ? filteredGrades.reduce((sum, item) => sum + item.risk_percentage, 0) / filteredGrades.length
    : 0

  const getRiskLevel = (risk: number) => {
    if (risk >= 30) return { level: "Critical", color: "bg-red-100 text-red-800 border-red-200" }
    if (risk >= 20) return { level: "High", color: "bg-orange-100 text-orange-800 border-orange-200" }
    if (risk >= 10) return { level: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" }
    return { level: "Low", color: "bg-green-100 text-green-800 border-green-200" }
  }

  const getRiskBarColor = (risk: number) => {
    if (risk >= 30) return "bg-red-500"
    if (risk >= 20) return "bg-orange-500"
    if (risk >= 10) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getContextTitle = () => {
    if (selectedSchool) return `Grade Level Risk Analysis - ${selectedSchool}`
    if (school) return `Grade Level Risk Analysis - ${school}`
    if (district) return `Grade Level Risk Analysis - ${district}`
    if (isGlobalView) return "Grade Level Risk Analysis - All Grades"
    return "Grade Level Risk Analysis"
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">📊 {getContextTitle()}</CardTitle>
          {(district || school || selectedSchool || isGlobalView) && (
            <div className="text-xs text-blue-100">{selectedSchool || school || district || "Global View"}</div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <AIProcessingAnimation isProcessing={true} message="Loading grade risk data..." type="loading" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Error loading grade risks: {error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && gradeRisks.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-l-4 border-blue-400 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{totalStudents.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-orange-400 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">{averageRisk.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Table Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="text-xs"
                >
                  Sort by Grade{" "}
                  {sortOrder === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />}
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedGrades.length)} of{" "}
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
                    const riskInfo = getRiskLevel(gradeRisk.risk_percentage)
                    return (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          Grade {gradeRisk.grade}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getRiskBarColor(gradeRisk.risk_percentage)}`}
                                style={{ width: `${Math.min(gradeRisk.risk_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{gradeRisk.risk_percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${riskInfo.color}`}>
                            {riskInfo.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-700">
                          {gradeRisk.student_count.toLocaleString()}
                        </td>
                      </tr>
                    )
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
  )
}

// New District Schools Risk Table Component
const DistrictSchoolsRiskTable: React.FC<{
  districtSchoolRisks: DistrictSchoolRisk[]
  isLoading: boolean
  error: string | null
  district: string
  isGlobalView?: boolean
  onSchoolClick: (schoolName: string) => void
}> = ({ districtSchoolRisks, isLoading, error, district, isGlobalView = false, onSchoolClick }) => {
  const [sortField, setSortField] = useState<"riskPercentage" | "schoolName" | "studentCount">("riskPercentage")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const itemsPerPage = 10

  // Filter schools based on search term
  const filteredSchools = districtSchoolRisks.filter((school) =>
    school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Always show table if there is data
  const shouldShowTable = filteredSchools.length > 0

  // Sort schools
  const sortedSchools = [...filteredSchools].sort((a, b) => {
    let aValue, bValue

    switch (sortField) {
      case "riskPercentage":
        aValue = a.riskPercentage
        bValue = b.riskPercentage
        break
      case "studentCount":
        aValue = a.studentCount
        bValue = b.studentCount
        break
      case "schoolName":
      default:
        aValue = a.schoolName.toLowerCase()
        bValue = b.schoolName.toLowerCase()
        break
    }

    if (typeof aValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue)
    } else {
      return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    }
  })

  const totalPages = Math.ceil(sortedSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSchools = sortedSchools.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field: "riskPercentage" | "schoolName" | "studentCount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder(field === "riskPercentage" ? "desc" : "asc")
    }
    setCurrentPage(1)
  }

  const getRiskBarColor = (risk: number) => {
    if (risk >= 30) return "bg-red-500"
    if (risk >= 20) return "bg-orange-500"
    if (risk >= 10) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getContextTitle = () => {
    if (district) return `District Schools Risk Analysis - ${district}`
    if (isGlobalView) return "District Schools Risk Analysis - All Schools"
    return "District Schools Risk Analysis"
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">🏫 {getContextTitle()}</CardTitle>
          {(district || isGlobalView) && <div className="text-xs text-blue-100">{district || "Global View"}</div>}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <AIProcessingAnimation isProcessing={true} message="Loading school risk data..." type="loading" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Error loading school risks: {error}</span>
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
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <div className="text-xs text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedSchools.length)} of{" "}
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
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 cursor-pointer transition-colors`}
                      onClick={() => onSchoolClick(school.schoolName)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                        {school.schoolName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getRiskBarColor(school.riskPercentage)}`}
                              style={{ width: `${Math.min(school.riskPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{school.riskPercentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(school.riskLevel)}`}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
  )
}

// What-If Simulation Component with AI Enhancements and Fixed Charts
const WhatIfSimulation: React.FC<{ analysisData: AnalysisData | null }> = ({ analysisData }) => {
  const [simulation, setSimulation] = useState<SimulationState>({
    tier1Improvement: 0,
    tier2Improvement: 0,
    tier3Improvement: 0,
    tier4Improvement: 0,
    isProcessing: false,
    isExpanded: true,
  })

  const [aiSuggestions, setAiSuggestions] = useState<{
    tier1: { name: string; confidence: number; impact: number }[]
    tier2: { name: string; confidence: number; impact: number }[]
    tier3: { name: string; confidence: number; impact: number }[]
    tier4: { name: string; confidence: number; impact: number }[]
  }>({
    tier1: [],
    tier2: [],
    tier3: [],
    tier4: [],
  })

  const [selectedStrategies, setSelectedStrategies] = useState<Record<string, string>>({})

  const [projectedOutcomes, setProjectedOutcomes] = useState<ProjectedOutcome[]>([])

  // Calculate projected outcomes with AI enhancements
  useEffect(() => {
    if (!analysisData) return

    const calculateOutcomes = () => {
      // Generate AI suggestions if not already generated
      if (aiSuggestions.tier1.length === 0) {
        const newAiSuggestions = { ...aiSuggestions }
        ;[1, 2, 3, 4].forEach((tier) => {
          const strategies = AI_STRATEGIES[`tier${tier}` as keyof typeof AI_STRATEGIES]
          newAiSuggestions[`tier${tier}` as keyof typeof newAiSuggestions] = strategies.map((strategy) => ({
            name: strategy.name,
            confidence: Math.min(
              95,
              Math.max(60, Math.floor(strategy.successRate * 100) + Math.floor(Math.random() * 10)),
            ),
            impact: Math.min(30, Math.max(-20, Math.floor((strategy.successRate - 0.5) * 40))),
          }))
        })
        setAiSuggestions(newAiSuggestions)
      }

      // Calculate outcomes with AI-enhanced predictions
      const outcomes: ProjectedOutcome[] = [1, 2, 3, 4].map((tier) => {
        const tierKey = `tier${tier}` as keyof typeof simulation
        const improvement = simulation[`${tierKey}Improvement` as keyof typeof simulation] as number
        const currentStudents = analysisData.summaryStatistics[`tier${tier}Students` as keyof SummaryStatistics] || 0

        // Apply AI strategy impact if selected
        const selectedStrategy = selectedStrategies[`tier${tier}`]
        let strategyImpact = 0
        if (selectedStrategy) {
          const strategy = AI_STRATEGIES[`tier${tier}` as keyof typeof AI_STRATEGIES].find(
            (s) => s.name === selectedStrategy,
          )
          if (strategy) {
            strategyImpact = Math.floor((strategy.successRate - 0.5) * 6)
          }
        }

        const effectiveImprovement = Math.max(-50, Math.min(50, improvement + strategyImpact))

        const improvedStudents = Math.floor(currentStudents * (effectiveImprovement / 100))
        return {
          tier,
          currentStudents,
          improvedStudents,
          improvementPercentage: effectiveImprovement,
          strategyImpact,
          projectedStudents: Math.max(0, currentStudents - improvedStudents),
        }
      })

      setProjectedOutcomes(outcomes)
    }

    // Simulate AI processing
    setSimulation((prev) => ({ ...prev, isProcessing: true }))
    const timer = setTimeout(() => {
      calculateOutcomes()
      setSimulation((prev) => ({ ...prev, isProcessing: false }))
    }, 800)

    return () => clearTimeout(timer)
  }, [
    simulation.tier1Improvement,
    simulation.tier2Improvement,
    simulation.tier3Improvement,
    simulation.tier4Improvement,
    analysisData,
    aiSuggestions,
    selectedStrategies,
  ])

  const handleSliderChange = (tier: number, value: number[]) => {
    const improvement = value[0]
    setSimulation((prev) => ({
      ...prev,
      [`tier${tier}Improvement`]: improvement,
    }))
  }

  const resetSimulation = () => {
    setSimulation((prev) => ({
      ...prev,
      tier1Improvement: 0,
      tier2Improvement: 0,
      tier3Improvement: 0,
      tier4Improvement: 0,
    }))
    setSelectedStrategies({})
  }

  const applyAiSuggestion = (tier: number, suggestion: { name: string; impact: number }) => {
    setSelectedStrategies((prev) => ({
      ...prev,
      [`tier${tier}`]: suggestion.name,
    }))

    setSimulation((prev) => ({
      ...prev,
      [`tier${tier}Improvement`]: Math.min(
        10,
        suggestion.impact + ((prev[`tier${tier}Improvement` as keyof SimulationState] as number) || 0),
      ),
    }))
  }

  const getAiRecommendation = (tier: number) => {
    const suggestions = aiSuggestions[`tier${tier}` as keyof typeof aiSuggestions]
    if (!suggestions || suggestions.length === 0) return null

    return suggestions[0]
  }

  const totalImprovedStudents = projectedOutcomes.reduce((sum, outcome) => sum + outcome.improvedStudents, 0)
  const totalStudents = analysisData?.summaryStatistics.totalStudents || 1
  const overallImprovementPercentage = (totalImprovedStudents / totalStudents) * 100

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return "bg-green-50 border-green-200 text-green-800"
      case 2:
        return "bg-emerald-50 border-emerald-200 text-emerald-800"
      case 3:
        return "bg-amber-50 border-amber-200 text-amber-800"
      case 4:
        return "bg-orange-50 border-orange-200 text-orange-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return "Tier 1 (≥95%)"
      case 2:
        return "Tier 2 (90-95%)"
      case 3:
        return "Tier 3 (80-90%)"
      case 4:
        return "Tier 4 (<80%)"
      default:
        return `Tier ${tier}`
    }
  }

  if (!analysisData) return null

  // Prepare chart data with better formatting
  const pieChartData = [
    {
      name: "Tier 1",
      value: projectedOutcomes[0]?.projectedStudents || 0,
      color: "#10b981",
    },
    {
      name: "Tier 2",
      value: projectedOutcomes[1]?.projectedStudents || 0,
      color: "#059669",
    },
    {
      name: "Tier 3",
      value: projectedOutcomes[2]?.projectedStudents || 0,
      color: "#d97706",
    },
    {
      name: "Tier 4",
      value: projectedOutcomes[3]?.projectedStudents || 0,
      color: "#ea580c",
    },
  ].filter((item) => item.value > 0)

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
      <CardHeader
        className="bg-[#03787c] text-white cursor-pointer hover:bg-[#026266] transition-all duration-300"
        onClick={() => setSimulation((prev) => ({ ...prev, isExpanded: !prev.isExpanded }))}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">✨ What-If Simulation</CardTitle>
              <p className="text-blue-100 text-sm">AI-Powered Improvement Scenarios</p>
              <p className="text-xs text-gray-500 italic">
                Simulated outcomes are estimates and may vary based on actual implementation.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              <span className="text-xs font-medium">Interactive</span>
            </div>
            {simulation.isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </CardHeader>

      {simulation.isExpanded && (
        <CardContent className="p-6 space-y-6">
          {/* AI Processing Animation */}
          <AIProcessingAnimation
            isProcessing={simulation.isProcessing}
            message="Calculating improvement projections..."
            type="processing"
          />

          {/* Sliders Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((tier) => (
              <div key={tier} className={`p-4 rounded-lg border-2 ${getTierColor(tier)}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-sm">{getTierLabel(tier)} Improvement</label>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span className="font-bold text-lg">
                      {simulation[`tier${tier}Improvement` as keyof SimulationState]}%
                    </span>
                  </div>
                </div>
                <Slider
                  value={[simulation[`tier${tier}Improvement` as keyof SimulationState] as number]}
                  onValueChange={(value) => handleSliderChange(tier, value)}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>-50%</span>
                  <span>-25%</span>
                  <span className="font-medium">0%</span>
                  <span>+25%</span>
                  <span>+50%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Projected Outcomes */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Projected Outcomes</h3>
            </div>

            {!simulation.isProcessing && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Card className="border-l-4 border-blue-400 bg-blue-50 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Current At-Risk Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {projectedOutcomes.reduce((sum, tier) => sum + tier.currentStudents, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-green-400 bg-green-50 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Projected Improvement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {totalImprovedStudents === 0
                          ? "0"
                          : totalImprovedStudents > 0
                          ? `+${totalImprovedStudents.toLocaleString()} students`
                          : `-${Math.abs(totalImprovedStudents).toLocaleString()} students`}
                      </div>
                      <div className="text-sm text-gray-500">
                        ({overallImprovementPercentage === 0
                          ? "0"
                          : overallImprovementPercentage > 0
                          ? `+${overallImprovementPercentage.toFixed(1)}`
                          : `-${Math.abs(overallImprovementPercentage).toFixed(1)}`}
                        % change)
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-purple-400 bg-purple-50 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Projected At-Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {projectedOutcomes.reduce((sum, tier) => sum + tier.projectedStudents, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {overallImprovementPercentage > 0 ? "↓" : "↑"}
                        {Math.abs(overallImprovementPercentage).toFixed(1)}% from current
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparison Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Bar Chart */}
                  <Card className="border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">📊 Before & After Comparison</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: "Tier 1",
                              current: projectedOutcomes[0]?.currentStudents || 0,
                              projected: projectedOutcomes[0]?.projectedStudents || 0,
                              color: "#10b981",
                            },
                            {
                              name: "Tier 2",
                              current: projectedOutcomes[1]?.currentStudents || 0,
                              projected: projectedOutcomes[1]?.projectedStudents || 0,
                              color: "#059669",
                            },
                            {
                              name: "Tier 3",
                              current: projectedOutcomes[2]?.currentStudents || 0,
                              projected: projectedOutcomes[2]?.projectedStudents || 0,
                              color: "#d97706",
                            },
                            {
                              name: "Tier 4",
                              current: projectedOutcomes[3]?.currentStudents || 0,
                              projected: projectedOutcomes[3]?.projectedStudents || 0,
                              color: "#ea580c",
                            },
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: number) => [value.toLocaleString(), "Students"]}
                            labelFormatter={(label) => `${label} Students`}
                          />
                          <Legend />
                          <Bar
                            dataKey="current"
                            name="Current"
                            fill="#94a3b8"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1000}
                          />
                          <Bar
                            dataKey="projected"
                            name="Projected"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1200}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Fixed Donut Chart with Better Label Handling */}
                  <Card className="border-l-4 border-green-400 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">📈 Risk Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                      <div className="w-full h-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={CustomPieLabel}
                              outerRadius={60}
                              innerRadius={30}
                              fill="#8884d8"
                              dataKey="value"
                              animationBegin={0}
                              animationDuration={800}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [value.toLocaleString(), "Students"]}
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Fallback text if no data */}
                        {pieChartData.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-gray-500 text-sm">No data to display</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <h4 className="text-sm font-medium text-gray-700 mb-2">Tier-wise Breakdown</h4>
                <div className="space-y-4">
                  {projectedOutcomes.map((outcome) => {
                    const suggestion = getAiRecommendation(outcome.tier)
                    const isStrategySelected = selectedStrategies[`tier${outcome.tier}`]

                    return (
                      <div key={outcome.tier} className={`p-4 rounded-lg border-2 ${getTierColor(outcome.tier)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {getTierLabel(outcome.tier)}
                              {isStrategySelected && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  Strategy Applied
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              Current: {outcome.currentStudents.toLocaleString()} students
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">+{outcome.improvedStudents.toLocaleString()}</div>
                            <div className="text-xs">
                              {outcome.improvementPercentage}% improvement
                              {outcome.strategyImpact ? ` (includes +${outcome.strategyImpact}% from strategy)` : ""}
                            </div>
                          </div>
                        </div>

                        {/* AI Recommendation */}
                        {suggestion && !isStrategySelected && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xs font-medium text-blue-800">AI Suggests:</div>
                                <div className="text-sm">{suggestion.name}</div>
                                <div className="text-xs text-blue-600">
                                  Estimated impact: +{suggestion.impact}% improvement
                                  <span className="ml-2 text-blue-500">(Confidence: {suggestion.confidence}%)</span>
                                </div>
                              </div>
                              <button
                                onClick={() => applyAiSuggestion(outcome.tier, suggestion)}
                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Selected Strategy */}
                        {isStrategySelected && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-xs font-medium text-green-800">Active Strategy:</div>
                                <div className="text-sm">{isStrategySelected}</div>
                              </div>
                              <button
                                onClick={() => {
                                  const newStrategies = {
                                    ...selectedStrategies,
                                  }
                                  delete newStrategies[`tier${outcome.tier}`]
                                  setSelectedStrategies(newStrategies)
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-500 italic">
                Recommendations based on attendance risk level and evidence-based interventions. Simulated impact is an
                estimate, not a guaranteed outcome.
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <Button
                onClick={resetSimulation}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 bg-transparent"
              >
                <Activity className="w-4 h-4" />
                <span>Reset Simulation</span>
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Helper functions for categorization
const categorizeInsights = (insights: Array<string | InsightItem>): CategorizedInsight[] => {
  const categories: { [key: string]: CategorizedInsight } = {
    predictive: {
      category: "Predictive Analytics",
      icon: "🔮",
      color: "bg-purple-50 border-purple-200",
      items: [],
    },
    pattern: {
      category: "Pattern Recognition",
      icon: "🧠",
      color: "bg-blue-50 border-blue-200",
      items: [],
    },
    behavioral: {
      category: "Behavioral Analytics",
      icon: "📊",
      color: "bg-green-50 border-green-200",
      items: [],
    },
    tier: {
      category: "Tier Analysis",
      icon: "📈",
      color: "bg-orange-50 border-orange-200",
      items: [],
    },
    general: {
      category: "General Insights",
      icon: "💡",
      color: "bg-gray-50 border-gray-200",
      items: [],
    },
  }

  insights.forEach((insight) => {
    const text = getTextFromItem(insight)
    const textLower = text.toLowerCase()

    // Generate confidence score based on text characteristics
    const confidence = generateConfidence(text)
    const priority = generatePriority(text)

    const item = { text, confidence, priority }

    if (textLower.includes("predict") || textLower.includes("forecast")) {
      categories.predictive.items.push(item)
    } else if (textLower.includes("pattern") || textLower.includes("trend") || textLower.includes("correlate")) {
      categories.pattern.items.push(item)
    } else if (textLower.includes("behavior") || textLower.includes("engagement")) {
      categories.behavioral.items.push(item)
    } else if (textLower.includes("tier") || textLower.includes("intervention")) {
      categories.tier.items.push(item)
    } else {
      categories.general.items.push(item)
    }
  })

  return Object.values(categories).filter((cat) => cat.items.length > 0)
}

const categorizeRecommendations = (
  recommendations: Array<string | RecommendationItem>,
): CategorizedRecommendation[] => {
  const priorities: { [key: string]: CategorizedRecommendation } = {
    HIGH: {
      priority: "HIGH",
      icon: "🔥",
      color: "bg-red-50 border-red-200",
      items: [],
    },
    MEDIUM: {
      priority: "MEDIUM",
      icon: "⚡",
      color: "bg-yellow-50 border-yellow-200",
      items: [],
    },
    LOW: {
      priority: "LOW",
      icon: "💡",
      color: "bg-blue-50 border-blue-200",
      items: [],
    },
  }

  recommendations.forEach((rec) => {
    const text = getTextFromItem(rec)
    const textLower = text.toLowerCase()
    const confidence = generateConfidence(text)

    const item = { text, confidence }

    if (
      textLower.includes("urgent") ||
      textLower.includes("critical") ||
      textLower.includes("immediate") ||
      textLower.includes("priority")
    ) {
      priorities.HIGH.items.push(item)
    } else if (textLower.includes("consider") || textLower.includes("improve") || textLower.includes("enhance")) {
      priorities.MEDIUM.items.push(item)
    } else {
      priorities.LOW.items.push(item)
    }
  })

  return Object.values(priorities).filter((cat) => cat.items.length > 0)
}

const generateConfidence = (text: string): number => {
  // Simple confidence scoring based on text characteristics
  let score = 70 // Base score

  if (text.includes("%")) score += 10
  if (text.includes("students")) score += 5
  if (text.includes("data") || text.includes("analysis")) score += 8
  if (text.length > 100) score += 5
  if (text.includes("recommend") || text.includes("suggest")) score += 7

  return Math.min(95, Math.max(60, score))
}

const generatePriority = (text: string): "HIGH" | "MEDIUM" | "LOW" => {
  const textLower = text.toLowerCase()

  if (textLower.includes("critical") || textLower.includes("urgent") || textLower.includes("risk")) {
    return "HIGH"
  } else if (textLower.includes("consider") || textLower.includes("improve") || textLower.includes("focus")) {
    return "MEDIUM"
  }
  return "LOW"
}

// Enhanced Alerts and Notifications Component with localStorage persistence
const AlertsNotifications: React.FC<{
  data: AnalysisData | null
  notificationsEnabled: boolean
  onToggleNotifications: (enabled: boolean) => void
}> = ({ data, notificationsEnabled, onToggleNotifications }): JSX.Element | null => {
  const [notifications, setNotifications] = React.useState<AlertNotification[]>([])
  const [isPaused, setIsPaused] = React.useState(false)
  const notificationInterval = React.useRef<NodeJS.Timeout | null>(null)
  const currentNotificationIndex = React.useRef(0)

  // Helper function to get appropriate icon for each alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      case "success":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Function to show a single toast notification at the top only
  const showToast = (notification: AlertNotification): void => {
    // Only show notifications if enabled - NO exceptions for critical alerts
    if (!notificationsEnabled) return
    if (isPaused) return

    const toastOptions = {
      duration: 6000,
      position: "top-right" as const,
      action: {
        label: "Dismiss",
        onClick: () => {},
      },
    }

    switch (notification.type) {
      case "error":
        toast.error(notification.title, {
          ...toastOptions,
          description: notification.description,
        })
        break
      case "warning":
        toast.warning(notification.title, {
          ...toastOptions,
          description: notification.description,
        })
        break
      case "success":
        toast.success(notification.title, {
          ...toastOptions,
          description: notification.description,
        })
        break
      default:
        toast(notification.title, {
          ...toastOptions,
          description: notification.description,
        })
    }
  }

  // Notification templates that will be cycled through
  const notificationTemplates = React.useMemo<NotificationTemplate[]>(
    () => [
      {
        id: "low-attendance-students",
        title: "Low Attendance Alert",
        description: (data) => {
          if (!data.alertsNotifications) return "No attendance data available"
          return `${data.alertsNotifications.totalBelow60.toLocaleString()} students have predicted attendance below 60%`
        },
        type: "error" as const,
        isCritical: true,
      },
      {
        id: "district-risk",
        title: "District Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.byDistrict?.length) return "No district data available"
          const highestRiskDistrict = data.alertsNotifications.byDistrict.sort((a, b) => b.count - a.count)[0]
          return `${
            highestRiskDistrict.district
          } has ${highestRiskDistrict.count.toLocaleString()} students below 60% attendance`
        },
        type: "warning" as const,
      },
      {
        id: "school-risk",
        title: "School Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.bySchool?.length) return "No school data available"
          const highestRiskSchool = data.alertsNotifications.bySchool.sort((a, b) => b.count - a.count)[0]
          return `${
            highestRiskSchool.school
          } has ${highestRiskSchool.count.toLocaleString()} students below 60% attendance`
        },
        type: "warning" as const,
      },
      {
        id: "grade-risk",
        title: "Grade Level Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.byGrade?.length) {
            return "No grade data available"
          }

          // Find the grade with the highest count of at-risk students
          const highestRisk = data.alertsNotifications.byGrade.reduce((prev, current) =>
            prev.count > current.count ? prev : current,
          )

          // Use either grade or grade_level property
          const grade = highestRisk.grade !== undefined ? highestRisk.grade : highestRisk.grade_level
          return `Grade ${grade} has the highest risk with ${highestRisk.count.toLocaleString()} students below 60% attendance`
        },
        type: "warning" as const,
      },
      {
        id: "total-students",
        title: "Total Attendance Overview",
        description: (data) => `Total Students: ${data.summaryStatistics.totalStudents?.toLocaleString() || "N/A"}`,
        type: "info" as const,
      },
      {
        id: "tier1-students",
        title: "Tier 1 Attendance (≥95%)",
        description: (data) => `${data.summaryStatistics.tier1Students?.toLocaleString() || "N/A"} students`,
        type: "success" as const,
      },
      {
        id: "tier4-students",
        title: "Tier 4 Attendance (<80%)",
        description: (data) => `${data.summaryStatistics.tier4Students?.toLocaleString() || "N/A"} students`,
        type: "error" as const,
        isCritical: true,
      },
    ],
    [],
  )

  // Function to get the next notification in the cycle
  const getNextNotification = React.useCallback(
    (data: AnalysisData): AlertNotification | null => {
      if (!data) return null

      const template = notificationTemplates[currentNotificationIndex.current % notificationTemplates.length]
      currentNotificationIndex.current++

      return {
        id: `${template.id}-${Date.now()}`,
        title: template.title,
        description: template.description(data),
        type: template.type,
        timestamp: new Date(),
        isCritical: template.isCritical || false,
      }
    },
    [notificationTemplates],
  )

  // Process data and generate notifications
  React.useEffect(() => {
    if (!data) {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current)
        notificationInterval.current = null
      }
      return
    }

    // Clear any existing interval
    if (notificationInterval.current) {
      clearInterval(notificationInterval.current)
    }

    // Only start notifications if enabled
    if (!notificationsEnabled) {
      return
    }

    // Initial notification
    const initialNotification = getNextNotification(data)
    if (initialNotification) {
      setNotifications((prev) => [...prev.slice(-9), initialNotification])
      showToast(initialNotification)
    }

    // Set up interval for recurring notifications (every 8-12 seconds)
    notificationInterval.current = setInterval(
      () => {
        if (notificationsEnabled && !isPaused) {
          const nextNotification = getNextNotification(data)
          if (nextNotification) {
            setNotifications((prev) => [...prev.slice(-9), nextNotification])
            showToast(nextNotification)
          }
        }
      },
      Math.floor(Math.random() * 4000) + 8000,
    ) // Random interval between 8-12 seconds

    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current)
      }
    }
  }, [data, getNextNotification, notificationsEnabled, isPaused])

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current)
      }
    }
  }, [])

  const handleToggleNotifications = () => {
    const newPausedState = !isPaused
    setIsPaused(newPausedState)

    if (newPausedState) {
      toast.info("Notifications paused")
    } else {
      toast.success("Notifications resumed")
    }
  }

  const handleClearAll = () => {
    setNotifications([])
    toast.info("All notifications cleared")
  }

  // Don't render anything if there's no data
  if (!data) return null

  // Only render the section if notifications are enabled
  const hasNotifications = notifications.length > 0
  const shouldShowPausedMessage = isPaused && !hasNotifications

  return (
    <>
      {/* Toast container positioned at top-right only */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            marginTop: "60px",
          },
        }}
      />

      {/* Only render the section if notifications are enabled */}
      {notificationsEnabled && (
        <div id="alerts-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Alerts & Notifications</h3>
            <div className="flex items-center gap-2">
              {hasNotifications && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearAll}>
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs flex items-center gap-1 ${
                  isPaused ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"
                }`}
                onClick={handleToggleNotifications}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" />
                    Pause
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Show paused message when notifications are paused and there are no notifications */}
          {shouldShowPausedMessage && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-orange-700">
                <Pause className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Notifications are currently paused. Resume to see the notifications.
                </span>
              </div>
            </div>
          )}

          {/* Show notifications if available */}
          {hasNotifications && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3 pr-2">
                {notifications.map((notification) => (
                  <Alert
                    key={notification.id}
                    variant={notification.type === "error" ? "destructive" : "default"}
                    className="cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">{getAlertIcon(notification.type)}</div>
                      <div className="ml-3">
                        <AlertTitle className="text-sm font-medium flex items-center gap-2">
                          {notification.title}
                          {notification.isCritical && (
                            <span className="bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded">Critical</span>
                          )}
                        </AlertTitle>
                        <AlertDescription className="text-xs">{notification.description}</AlertDescription>
                        <div className="text-xs text-muted-foreground mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </>
  )
}

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.field]: action.payload.value,
        },
      }
    case "RESET_FILTERS":
      return {
        ...state,
        filters: { district: "", school: "", grade: "" },
        selectedSchoolForGrades: null,
        options: {
          ...state.options,
          schoolOptions: [],
          gradeOptions: [],
        },
        ui: {
          ...state.ui,
          isGlobalView: true,
        },
      }
    case "SET_OPTIONS":
      return {
        ...state,
        options: { ...state.options, ...action.payload },
      }
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      }
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, ...action.payload },
      }
    case "CLEAR_ERRORS":
      return {
        ...state,
        errors: { generalError: null, downloadError: null, gradeRiskError: null },
      }
    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      }
    case "SET_ANALYSIS_DATA":
      return {
        ...state,
        analysisData: action.payload,
      }
    case "SET_LOAD_TIMER":
      return {
        ...state,
        loadTimer: action.payload,
      }
    case "SET_GRADE_RISKS":
      return {
        ...state,
        gradeRisks: action.payload,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: null },
      }
    case "SET_GRADE_RISKS_LOADING":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: action.payload },
      }
    case "SET_GRADE_RISKS_ERROR":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: action.payload },
      }
    case "SET_DISTRICT_SCHOOL_RISKS":
      return {
        ...state,
        districtSchoolRisks: action.payload,
      }
    case "SET_SELECTED_SCHOOL_FOR_GRADES":
      return {
        ...state,
        selectedSchoolForGrades: action.payload,
      }
    case "SET_FULL_DISTRICT_SCHOOL_LIST":
      return {
        ...state,
        fullDistrictSchoolList: action.payload,
      }
    default:
      return state
  }
}

// Helper functions remain the same
const processDistrictCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined
  return /^D\d+$/.test(code) ? code.substring(1) : code
}

const extractSchoolCode = (schoolValue: string): string => {
  if (!schoolValue) return ""
  return schoolValue.includes("-") ? schoolValue.split("-").pop() || schoolValue : schoolValue
}

const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
  districtCode: filters.district ? processDistrictCode(filters.district) : "",
  gradeCode: filters.grade || "",
  schoolCode: filters.school ? extractSchoolCode(filters.school) : "",
})

const extractErrorMessage = (error: ApiError): string => {
  if (error.response) {
    if (error.response.data?.detail) {
      return error.response.data.detail
    }
    if (error.response.status === 404) {
      return "No data found for the selected filters."
    }
    if (error.response.status === 503) {
      return "Server is still initializing. Please try again in a moment."
    }
  } else if (error.request) {
    return "No response from server. Please check your connection."
  }
  return `Request error: ${error.message}`
}

const formatTextWithHighlights = (text: string): string => {
  let formattedText = text.replace(/^([^:]+)(:)/, '<strong class="font-semibold text-gray-900">$1</strong>:')

  if (formattedText === text) {
    formattedText = text.replace(/^(\w+(?:\s+\w+){0,4}\b)/, '<strong class="font-semibold text-gray-900">$1</strong>')
  }

  formattedText = formattedText.replace(
    /(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?%)/g,
    '<strong class="text-teal-700">$1</strong>',
  )

  return formattedText
}

const getTextFromItem = (item: string | InsightItem | RecommendationItem): string => {
  if (typeof item === "string") return item
  if ("text" in item && item.text) return item.text
  if ("insight" in item && item.insight) return item.insight
  if ("recommendation" in item && item.recommendation) return item.recommendation
  return "No content available"
}

const extractPrioritySchools = (recommendations: Array<string | RecommendationItem>): PrioritySchool[] => {
  const schools: PrioritySchool[] = []
  const seen = new Set<string>()

  recommendations.forEach((item) => {
    const text = getTextFromItem(item)
    const match = text.match(/to\s+([^,]+?)\s+in\s+([^,]+?)\s+with\s+([\d.]+)%/i)
    if (match) {
      const [, schoolName, district, risk] = match
      const key = `${schoolName}-${district}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        schools.push({
          schoolName: schoolName.trim(),
          district: district.trim(),
          riskPercentage: Number.parseFloat(risk),
        })
      }
    }
  })

  return schools.sort((a, b) => b.riskPercentage - a.riskPercentage)
}

const extractGradeLevelRisks = (recommendations: Array<string | RecommendationItem>): GradeRisk[] => {
  const grades: GradeRisk[] = []
  const seen = new Set<string>()

  recommendations.forEach((item) => {
    const text = getTextFromItem(item)
    const match = text.match(/Grade\s+(\d+)[^\d]+?([\d.]+)%/i)
    if (match) {
      const [, grade, risk] = match
      const gradeKey = `grade-${grade}`
      if (!seen.has(gradeKey)) {
        seen.add(gradeKey)
        grades.push({
          grade: grade,
          count: 0,
          riskPercentage: Number.parseFloat(risk),
        })
      }
    }
  })

  return grades.sort((a, b) => {
    const gradeA = typeof a.grade === "string" ? Number.parseInt(a.grade.replace("Grade ", "")) : a.grade
    const gradeB = typeof b.grade === "string" ? Number.parseInt(b.grade.replace("Grade ", "")) : b.grade
    return Number(gradeA) - Number(gradeB)
  })
}

const createOptionKey = (prefix: string, value: string, index?: number, additional?: string): string => {
  return `${prefix}-${additional || "none"}-${value}${index !== undefined ? `-${index}` : ""}`
}

// Function to generate mock district school risks data
const generateDistrictSchoolRisks = (analysisData: AnalysisData | null, district: string): DistrictSchoolRisk[] => {
  if (!analysisData || !district) return []

  const schoolData = analysisData.alertsNotifications?.bySchool || []

  return schoolData
    .map((school, index) => {
      const riskPercentage = Math.random() * 40 + 5
      let riskLevel: "Critical" | "High" | "Medium" | "Low"

      if (riskPercentage >= 30) riskLevel = "Critical"
      else if (riskPercentage >= 20) riskLevel = "High"
      else if (riskPercentage >= 10) riskLevel = "Medium"
      else riskLevel = "Low"

      return {
        schoolName: school.school,
        riskPercentage,
        riskLevel,
        studentCount: school.count + Math.floor(Math.random() * 200) + 100,
        district,
      }
    })
    .sort((a, b) => b.riskPercentage - a.riskPercentage)
}

// Debounce hook for performance optimization
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Helper for risk level based on student count (used in district school risks mapping)
const getRiskLevel = (count: number): 'Critical' | 'High' | 'Medium' | 'Low' => {
  if (count > 100) return 'Critical'
  if (count > 50) return 'High'
  if (count > 10) return 'Medium'
  return 'Low'
}

const AlertsDashboard: React.FC = () => {
  console.log("Rendering AlertsDashboard component")
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [insightsExpanded, setInsightsExpanded] = useState(true)
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(true)
  const [notificationHistory, setNotificationHistory] = useState<AlertNotification[]>([])
  const { token, ready } = useAuth()
  const authReady = ready && !!token

  // Reduce debounce delay for smoother updates
  const debouncedDistrict = useDebounce(state.filters.district, 150) // Reduced from 300ms
  const debouncedSchool = useDebounce(state.filters.school, 150) // Reduced from 300ms
  const debouncedGrade = useDebounce(state.filters.grade, 150) // Reduced from 300ms

  console.log("Auth state:", { token: !!token, ready, authReady })

  // Load notification preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem("notifications-enabled")
    if (savedPreference !== null) {
      dispatch({
        type: "SET_UI",
        payload: { notificationsEnabled: JSON.parse(savedPreference) },
      })
    }
  }, [])

  // Save notification preference to localStorage
  const handleToggleNotifications = useCallback((enabled: boolean) => {
    dispatch({
      type: "SET_UI",
      payload: { notificationsEnabled: enabled },
    })
    localStorage.setItem("notifications-enabled", JSON.stringify(enabled))

    if (enabled) {
      toast.success("Notifications enabled")
    } else {
      toast.info("Notifications disabled")
    }
  }, [])

  const handleClearNotificationHistory = useCallback(() => {
    setNotificationHistory([])
  }, [])

  const handleSchoolClick = useCallback((schoolName: string) => {
    dispatch({ type: "SET_SELECTED_SCHOOL_FOR_GRADES", payload: schoolName })
    toast.info(`Viewing grade analysis for ${schoolName}`)
  }, [])

  useEffect(() => {
    setAuthToken(token)
  }, [authReady, token])

  // Generate district school risks when analysis data, district, or grade changes
  useEffect(() => {
    if (state.analysisData && state.filters.district) {
      // Always use the full school list for the selected district
      const fullList = state.fullDistrictSchoolList
      // Get the current bySchool data from analysisData (filtered by grade if needed)
      const bySchool = state.analysisData.alertsNotifications?.bySchool || []
      // If a grade filter is applied, try to use only the relevant student counts (if available)
      // (Assume backend returns filtered data for grade if filter is set, otherwise fallback to all)
      const risks = fullList.map((school) => {
        const found = bySchool.find(
          (s) => s.school.toLowerCase().trim() === (school.label || school.value).toLowerCase().trim()
        )
        const studentCount = found ? found.count || 0 : 0
        return {
          schoolName: school.label || school.value,
          riskPercentage: 0,
          riskLevel: getRiskLevel(studentCount),
          studentCount,
          district: school.district || state.filters.district,
        }
      })
      dispatch({ type: "SET_DISTRICT_SCHOOL_RISKS", payload: risks })
    } else if (state.ui.isGlobalView && state.analysisData) {
      // For global view, fallback to previous logic
      const globalSchoolRisks = generateDistrictSchoolRisks(state.analysisData, "All Districts")
      dispatch({ type: "SET_DISTRICT_SCHOOL_RISKS", payload: globalSchoolRisks })
    } else {
      dispatch({ type: "SET_DISTRICT_SCHOOL_RISKS", payload: [] })
    }
  }, [state.analysisData, state.filters.district, state.filters.grade, state.fullDistrictSchoolList, state.ui.isGlobalView])

  const fetchInitialData = useCallback(async (): Promise<void> => {
    console.log("fetchInitialData called")
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, isProcessingAI: true },
    })
    dispatch({ type: "CLEAR_ERRORS" })
    console.log("Loading state set to true")

    if (state.loadTimer) {
      clearTimeout(state.loadTimer)
    }

    try {
      try {
        console.log("Fetching filter options...")
        const filterOptionsRes = await alertsService.getFilterOptions()
        console.log("Received filter options:", filterOptionsRes)
        const { districts, schools, grades } = filterOptionsRes
        console.log("Parsed filter options:", {
          districtsCount: districts?.length,
          schoolsCount: schools?.length,
          gradesCount: grades?.length,
        })

        const formattedDistricts: DistrictOption[] = Array.isArray(districts)
          ? districts.map((d: any) => ({
              ...d,
              value: d.value.toString().replace(/^D/, ""),
              label: d.label,
            }))
          : []

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            districtOptions: formattedDistricts,
            allSchoolOptions: schools || [],
          },
        })

        // Fixed hierarchical filter behavior
        if (state.filters.district) {
          const filteredSchools = (schools || []).filter((s: SchoolOption) => s.district === state.filters.district)
          dispatch({
            type: "SET_OPTIONS",
            payload: { schoolOptions: filteredSchools },
          })

          if (state.filters.school) {
            const filteredGrades = (grades || []).filter((g: GradeOption) => g.school === state.filters.school)
            dispatch({
              type: "SET_OPTIONS",
              payload: { gradeOptions: filteredGrades },
            })
          }
        }
      } catch (err) {
        console.error("Error fetching filter options:", err)
        dispatch({
          type: "SET_ERROR",
          payload: {
            generalError: "Failed to load filter options. Please try again.",
          },
        })
      }

      try {
        const searchCriteria = {
          districtCode: "",
          gradeCode: "",
          schoolCode: "",
        }
        console.log("Fetching analysis data with criteria:", searchCriteria)

        console.log("Calling getPredictionInsights...")
        const analysisRes = await alertsService.getPredictionInsights(searchCriteria)
        console.log("Received analysis data:", analysisRes)
        dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisRes })
        dispatch({ type: "SET_UI", payload: { isGlobalView: true } })
        dispatch({ type: "SET_LOADING", payload: { isInitialLoad: false } })
        console.log("Analysis data set, loading complete")
      } catch (analysisErr: any) {
        console.error("Error fetching analysis:", analysisErr)
        if (!analysisErr.message?.includes("starting up")) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              generalError: "Failed to load initial data. Please try again.",
            },
          })
        }
      }
    } catch (err) {
      console.error("Error fetching initial data:", err)

      const timer = setTimeout(() => {
        fetchInitialData()
      }, 3000)

      dispatch({ type: "SET_LOAD_TIMER", payload: timer })
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      })
    }
  }, [state.loadTimer, state.filters.district, state.filters.school])

  // Fixed fetchSchoolsForDistrict with proper hierarchical behavior
  const fetchSchoolsForDistrict = useCallback(
    async (district: string): Promise<void> => {
      if (!district) {
        dispatch({
          type: "SET_OPTIONS",
          payload: {
            schoolOptions: [],
            gradeOptions: [],
          },
        })
        dispatch({ type: "SET_FULL_DISTRICT_SCHOOL_LIST", payload: [] }) // Clear full list if no district
        return
      }

      try {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: true } })

        const filteredSchools = await alertsService.getSchoolsByDistrict({
          district: district,
        })

        const schoolsWithKeys: SchoolOption[] = filteredSchools.map((school: any, index: number) => ({
          ...school,
          key: `school-${school.value}-${district}-${index}`,
          location_id: school.location_id || school.value.split("-").pop(),
          district: district,
        }))

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            schoolOptions: schoolsWithKeys,
            gradeOptions: [],
          },
        })
        dispatch({ type: "SET_FULL_DISTRICT_SCHOOL_LIST", payload: schoolsWithKeys }) // Store full list for district

        // Reset school and grade if current school is not valid for new district
        const currentSchoolValid =
          state.filters.school && schoolsWithKeys.some((s: SchoolOption) => s.value === state.filters.school)

        if (state.filters.school && !currentSchoolValid) {
          dispatch({
            type: "SET_FILTER",
            payload: { field: "school", value: "" },
          })
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          })
        }
      } catch (error) {
        console.error("Error fetching schools for district:", error)
        dispatch({
          type: "SET_OPTIONS",
          payload: { schoolOptions: [], gradeOptions: [] },
        })
        dispatch({ type: "SET_FULL_DISTRICT_SCHOOL_LIST", payload: [] }) // Clear on error
        dispatch({
          type: "SET_FILTER",
          payload: { field: "school", value: "" },
        })
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        })
      } finally {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: false } })
      }
    },
    [state.filters.school],
  )

  // Fixed fetchGradesForSchool with proper hierarchical behavior
  const fetchGradesForSchool = useCallback(
    async (school: string, district: string): Promise<void> => {
      if (!school || !district) {
        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: [] },
        })
        return
      }

      try {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: true } })

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            gradeOptions: [
              {
                value: "loading",
                label: "Loading grades...",
                school,
                district,
              },
            ],
          },
        })

        const schoolCode = extractSchoolCode(school)

        console.log("Fetching grades for:", {
          originalSchool: school,
          extractedSchoolCode: schoolCode,
          district: district,
        })

        const gradesData = await alertsService.getGradesBySchool({
          school: school,
          district: district,
        })

        const formattedGrades: GradeOption[] = gradesData.map((g: any) => ({
          value: g.value.toString(),
          label: g.label || `Grade ${g.value}`,
          school: school,
          district: district,
        }))

        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: formattedGrades },
        })

        // Reset grade if current grade is not valid for new school
        if (state.filters.grade && !formattedGrades.some((g) => g.value === state.filters.grade)) {
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          })
        }
      } catch (error) {
        console.error("Error fetching grades:", error)
        if (school === state.filters.school) {
          dispatch({
            type: "SET_OPTIONS",
            payload: { gradeOptions: [] },
          })
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          })
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: false } })
      }
    },
    [state.filters.grade, state.filters.school],
  )

  // Dynamic data fetching with debounced filters
  const fetchAnalysisData = useCallback(async (): Promise<AnalysisData | undefined> => {
    // Don't fetch if no meaningful filters are selected
    if (!debouncedDistrict && !debouncedSchool && !debouncedGrade) {
      return
    }

    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, isProcessingAI: true },
    })
    dispatch({ type: "CLEAR_ERRORS" })
    dispatch({ type: "SET_UI", payload: { isGlobalView: false } })

    try {
      const searchCriteria: SearchCriteria = {
        districtCode: debouncedDistrict ? processDistrictCode(debouncedDistrict) : "",
        gradeCode: debouncedGrade || "",
        schoolCode: debouncedSchool ? extractSchoolCode(debouncedSchool) : "",
      }

      console.log("Sending request to prediction-insights with data:", JSON.stringify(searchCriteria, null, 2))

      const analysisData = await alertsService.getPredictionInsights(searchCriteria)

      console.log("Received response:", analysisData)

      dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData })
      dispatch({ type: "CLEAR_ERRORS" })
      return analysisData
    } catch (err: any) {
      console.error("Error fetching analysis:", err)
      const errorMessage = extractErrorMessage(err)
      dispatch({
        type: "SET_ERROR",
        payload: { generalError: errorMessage },
      })
      throw err
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      })
    }
  }, [debouncedDistrict, debouncedSchool, debouncedGrade])

  const handleDownloadReport = useCallback(
    async (reportType: string): Promise<void> => {
      try {
        dispatch({
          type: "SET_LOADING",
          payload: { isDownloadingReport: true, isProcessingAI: true },
        })
        dispatch({ type: "SET_ERROR", payload: { downloadError: null } })

        const downloadCriteria: DownloadCriteria = {
          ...createSearchCriteria(state.filters),
          reportType: reportType,
        }

        console.log("Download criteria:", downloadCriteria)

        const blob = await alertsService.downloadReport(reportType, downloadCriteria)

        const filename = alertsService.generateReportFilename(reportType)
        alertsService.triggerDownload(blob, filename)
        toast.success("Report downloaded successfully!")
      } catch (err: any) {
        console.error("Error in downloadReport:", err)
        const errorMessage = extractErrorMessage(err)
        dispatch({
          type: "SET_ERROR",
          payload: {
            downloadError: `Error downloading report: ${errorMessage}`,
          },
        })
        toast.error("Failed to download report")
      } finally {
        dispatch({
          type: "SET_LOADING",
          payload: { isDownloadingReport: false, isProcessingAI: false },
        })
      }
    },
    [state.filters],
  )

  // Optimize the reset function for faster performance:
  const resetFiltersAndFetchGlobal = useCallback(async (): Promise<void> => {
    try {
      // Show immediate loading state
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: true, isProcessingAI: true },
      })
      dispatch({ type: "CLEAR_ERRORS" })

      // Reset all filters and state immediately - no await needed
      dispatch({ type: "RESET_FILTERS" })

      // Use cached global data if available, otherwise fetch
      if (state.analysisData && state.ui.isGlobalView) {
        // If we already have global data, just reset filters without refetching
        dispatch({ type: "SET_ANALYSIS_DATA", payload: state.analysisData })
        dispatch({ type: "CLEAR_ERRORS" })
        toast.success("Filters reset to global view")

        dispatch({
          type: "SET_LOADING",
          payload: { isLoading: false, isProcessingAI: false },
        })
        return
      }

      // Only fetch if we don't have global data
      const searchCriteria = {
        districtCode: "",
        gradeCode: "",
        schoolCode: "",
      }

      const analysisData = await alertsService.getPredictionInsights(searchCriteria)

      dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData })
      dispatch({ type: "CLEAR_ERRORS" })

      toast.success("Filters reset to global view")
    } catch (err: any) {
      console.error("Error in resetFiltersAndFetchGlobal:", err)
      const errorMessage = extractErrorMessage(err)
      dispatch({
        type: "SET_ERROR",
        payload: { generalError: errorMessage },
      })
      toast.error("Failed to reset filters")
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      })
    }
  }, [state.analysisData, state.ui.isGlobalView]) // Added dependencies for caching

  // Function to fetch grade risk data
  const fetchGradeRisks = useCallback(async () => {
    const { district, school } = state.filters
    const selectedSchool = state.selectedSchoolForGrades

    // Determine which school to use for grade risks
    const schoolForGrades = selectedSchool || school

    // Only fetch if we have both district and school selected, or if it's global view
    if (!district && !schoolForGrades && !state.ui.isGlobalView) {
      dispatch({ type: "SET_GRADE_RISKS", payload: [] })
      return
    }

    try {
      dispatch({ type: "SET_GRADE_RISKS_LOADING", payload: true })
      dispatch({ type: "SET_GRADE_RISKS_ERROR", payload: null })

      const response: GradeRiskResponse = await alertsService.getGradeRisks(district, schoolForGrades || "")

      // Map the API response to match our GradeRiskItem interface
      const gradeRisks = response.grades.map((grade) => ({
        grade: grade.grade,
        risk_percentage: grade.risk_percentage,
        student_count: grade.student_count,
      }))

      dispatch({ type: "SET_GRADE_RISKS", payload: gradeRisks })
    } catch (error) {
      console.error("Error fetching grade risks:", error)
      dispatch({
        type: "SET_GRADE_RISKS_ERROR",
        payload: "Failed to load grade risk data",
      })
    } finally {
      dispatch({ type: "SET_GRADE_RISKS_LOADING", payload: false })
    }
  }, [state.filters.district, state.filters.school, state.selectedSchoolForGrades, state.ui.isGlobalView])

  // Fetch grade risks when district, school, or selected school changes
  useEffect(() => {
    fetchGradeRisks()
  }, [fetchGradeRisks])

  // Optimize filter change handling for smoother updates:
  const handleFilterChange = useCallback(
    (field: keyof FilterState, value: string) => {
      // Immediate UI update without waiting
      if (field === "district" && value !== state.filters.district) {
        // When district changes, reset school and grade immediately
        dispatch({ type: "SET_FILTER", payload: { field: "district", value } })
        dispatch({ type: "SET_FILTER", payload: { field: "school", value: "" } })
        dispatch({ type: "SET_FILTER", payload: { field: "grade", value: "" } })
        dispatch({ type: "SET_SELECTED_SCHOOL_FOR_GRADES", payload: null })

        // Clear existing options immediately for better UX
        dispatch({
          type: "SET_OPTIONS",
          payload: { schoolOptions: [], gradeOptions: [] },
        })
      } else if (field === "school" && value !== state.filters.school) {
        // When school changes, reset grade immediately
        dispatch({ type: "SET_FILTER", payload: { field: "school", value } })
        dispatch({ type: "SET_FILTER", payload: { field: "grade", value: "" } })
        dispatch({ type: "SET_SELECTED_SCHOOL_FOR_GRADES", payload: null })

        // Clear grade options immediately
        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: [] },
        })
      } else {
        dispatch({ type: "SET_FILTER", payload: { field, value } })
      }
    },
    [state.filters.district, state.filters.school],
  )

  const handleToggleFilters = useCallback(() => {
    dispatch({
      type: "SET_UI",
      payload: { showFilters: !state.ui.showFilters },
    })
  }, [state.ui.showFilters])

  useEffect(() => {
    console.log("useEffect - authReady changed:", { authReady })
    if (!authReady) {
      console.log("authReady is false, not fetching data yet")
      return
    }
    console.log("authReady is true, fetching initial data")
    fetchInitialData()

    return () => {
      if (state.loadTimer) {
        clearTimeout(state.loadTimer)
      }
    }
  }, [authReady, state.loadTimer])

  // Real-time filter updates with debouncing
  useEffect(() => {
    fetchSchoolsForDistrict(debouncedDistrict)
  }, [debouncedDistrict, fetchSchoolsForDistrict])

  useEffect(() => {
    if (debouncedSchool && debouncedDistrict) {
      fetchGradesForSchool(debouncedSchool, debouncedDistrict)
    } else {
      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: [] },
      })
      if (state.filters.grade) {
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        })
      }
    }
  }, [debouncedSchool, debouncedDistrict, fetchGradesForSchool])

  // Auto-fetch analysis data when filters change (real-time filtering)
  useEffect(() => {
    if (debouncedDistrict || debouncedSchool || debouncedGrade) {
      fetchAnalysisData()
    }
  }, [debouncedDistrict, debouncedSchool, debouncedGrade, fetchAnalysisData])

  const LoadingSkeletonCards: React.FC = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="animate-pulse h-32">
          <CardHeader className="pb-2">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </CardContent>
        </Card>
      ))}
    </>
  )

  // Enhanced Report Downloading Modal with AI Processing
  const ReportDownloadingModal: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <AIProcessingAnimation
          isProcessing={true}
          message="Compiling data and generating your report..."
          type="downloading"
        />
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">This may take a few moments</p>
        </div>
      </div>
    </div>
  )

  // Fixed FilterSection with real-time updates (no Apply Filters button)
  const FilterSection: React.FC = () => (
    <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="district-select">
          District
        </label>
        <select
          id="district-select"
          value={state.filters.district}
          onChange={(e) => handleFilterChange("district", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white"
          style={{
            borderColor: "#C0D5DE",
            borderWidth: "1.6px",
          }}
          disabled={state.loading.isInitialLoad || state.loading.isProcessingAI}
          aria-label="Select district"
        >
          <option value="">Select District</option>
          {state.options.districtOptions.map((d, index) => (
            <option key={createOptionKey("district", d.value, index)} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="school-select">
          School
        </label>
        <select
          id="school-select"
          value={state.filters.school}
          onChange={(e) => handleFilterChange("school", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "#C0D5DE",
            borderWidth: "1.6px",
          }}
          disabled={!state.filters.district || state.options.schoolOptions.length === 0 || state.loading.isProcessingAI}
          aria-label="Select school"
        >
          <option value="">
            {!state.filters.district
              ? "Select District First"
              : state.options.schoolOptions.length === 0
                ? "No Schools Available"
                : "Select School"}
          </option>
          {state.options.schoolOptions.map((s, index) => (
            <option key={createOptionKey("school", s.value, index, s.district)} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="grade-select">
          Grade
        </label>
        <select
          id="grade-select"
          value={state.filters.grade}
          onChange={(e) => handleFilterChange("grade", e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "#C0D5DE",
            borderWidth: "1.6px",
          }}
          disabled={!state.filters.school || state.options.gradeOptions.length === 0 || state.loading.isProcessingAI}
          aria-label="Select grade"
        >
          <option value="">
            {!state.filters.school
              ? "Select School First"
              : state.options.gradeOptions.length === 0
                ? "No Grades Available"
                : "Select Grade"}
          </option>
          {state.options.gradeOptions.map((g, index) => (
            <option key={createOptionKey("grade", g.value, index, g.school)} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Button
          onClick={resetFiltersAndFetchGlobal}
          variant="outline"
          disabled={state.loading.isLoading || state.loading.isProcessingAI}
          className="w-full bg-transparent"
        >
          {state.loading.isProcessingAI ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Reset to Global View"
          )}
        </Button>
      </div>
      {/* Report Download Dropdown - moved here */}
      <div className="mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={state.loading.isDownloadingReport} className="w-full">
              {state.loading.isDownloadingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-full">
            <DropdownMenuItem
              onClick={() => handleDownloadReport("summary")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Summary Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadReport("detailed")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Detailed Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadReport("tier1")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Tier 1 Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadReport("tier2")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Tier 2 Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadReport("tier3")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Tier 3 Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadReport("tier4")}
              disabled={state.loading.isDownloadingReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Tier 4 Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* ...rest of filter section... */}

      {/* Real-time filter status indicator */}
      {state.loading.isProcessingAI && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center space-x-2 text-blue-700">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Updating data...</span>
          </div>
        </div>
      )}
    </div>
  )

  // Enhanced Header with notification toggle
  const Header: React.FC = () => (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Alerts Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={handleToggleFilters} className="lg:hidden">
            {state.ui.showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Notifications: {state.ui.notificationsEnabled ? "On" : "Off"}</span>
            <Button
              variant={state.ui.notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleNotifications(!state.ui.notificationsEnabled)}
              className={`text-xs ${
                state.ui.notificationsEnabled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {state.ui.notificationsEnabled ? "ON" : "OFF"}
            </Button>
            <NotificationToggle
              enabled={state.ui.notificationsEnabled}
              onToggle={handleToggleNotifications}
              notifications={notificationHistory}
              onClearHistory={handleClearNotificationHistory}
            />
          </div>
        </div>
      </div>
    </div>
  )

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Report Downloading Modal */}
      {state.loading.isDownloadingReport && <ReportDownloadingModal />}

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Filters Sidebar */}
        <div className={`${state.ui.showFilters ? "block" : "hidden"} lg:block transition-all duration-300`}>
          <FilterSection />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Loading State */}
          {state.loading.isInitialLoad && (
            <div className="space-y-6">
              <AIProcessingAnimation isProcessing={true} message="Loading dashboard data..." type="loading" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <LoadingSkeletonCards />
              </div>
            </div>
          )}

          {/* Error State */}
          {state.errors.generalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.errors.generalError}</AlertDescription>
            </Alert>
          )}

          {/* Main Dashboard Content */}
          {!state.loading.isInitialLoad && state.analysisData && (
            <div className="space-y-6">
              {/* Global Risk Overview - Only show when no filters are selected */}
              {state.ui.isGlobalView && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Global Overview</h2>
                  <GlobalRiskOverviewCard analysisData={state.analysisData} />
                </div>
              )}

              {/* Summary Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-blue-400 bg-blue-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-800">
                      {state.analysisData.summaryStatistics.totalStudents.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-green-400 bg-green-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Tier 1 (≥95%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-800">
                      {state.analysisData.summaryStatistics.tier1Students.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-yellow-400 bg-yellow-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Tier 2 (90-95%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-800">
                      {state.analysisData.summaryStatistics.tier2Students.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-orange-400 bg-orange-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Tier 3 (80-90%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-800">
                      {state.analysisData.summaryStatistics.tier3Students.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-red-400 bg-red-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Tier 4 (&lt;80%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-800">
                      {state.analysisData.summaryStatistics.tier4Students.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Distribution Chart */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">📊 Attendance Tier Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Tier 1",
                            students: state.analysisData.summaryStatistics.tier1Students,
                            color: "#10b981",
                          },
                          {
                            name: "Tier 2",
                            students: state.analysisData.summaryStatistics.tier2Students,
                            color: "#f59e0b",
                          },
                          {
                            name: "Tier 3",
                            students: state.analysisData.summaryStatistics.tier3Students,
                            color: "#f97316",
                          },
                          {
                            name: "Tier 4",
                            students: state.analysisData.summaryStatistics.tier4Students,
                            color: "#ef4444",
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), "Students"]}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                          }}
                        />
                        <Bar dataKey="students" fill="#8884d8" radius={[4, 4, 0, 0]} animationDuration={1000}>
                          {[{ color: "#10b981" }, { color: "#f59e0b" }, { color: "#f97316" }, { color: "#ef4444" }].map(
                            (entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ),
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Risk Distribution Pie Chart */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">📈 Risk Level Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Low Risk (Tier 1-2)",
                              value:
                                state.analysisData.summaryStatistics.tier1Students +
                                state.analysisData.summaryStatistics.tier2Students,
                              color: "#10b981",
                            },
                            {
                              name: "Medium Risk (Tier 3)",
                              value: state.analysisData.summaryStatistics.tier3Students,
                              color: "#f97316",
                            },
                            {
                              name: "High Risk (Tier 4)",
                              value: state.analysisData.summaryStatistics.tier4Students,
                              color: "#ef4444",
                            },
                          ].filter((item) => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={CustomPieLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {[{ color: "#10b981" }, { color: "#f97316" }, { color: "#ef4444" }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), "Students"]}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts & Notifications - Move this before AI Insights */}
              <AlertsNotifications
                data={state.analysisData}
                notificationsEnabled={state.ui.notificationsEnabled}
                onToggleNotifications={handleToggleNotifications}
              />

              {/* AI Insights Section */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setInsightsExpanded(!insightsExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-600" />🧠 AI-Powered Insights
                    </CardTitle>
                    {insightsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
                {insightsExpanded && (
                  <CardContent className="space-y-4">
                    {categorizeInsights(state.analysisData.keyInsights).map((category, index) => (
                      <div key={index} className={`p-4 rounded-lg border-2 ${category.color}`}>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.category}
                        </h4>
                        <div className="space-y-2">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-start justify-between">
                              <div className="flex-1">
                                <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: formatTextWithHighlights(item.text),
                                  }}
                                />
                              </div>
                              <div className="ml-4 flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    item.priority === "HIGH"
                                      ? "bg-red-100 text-red-800"
                                      : item.priority === "MEDIUM"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {item.priority}
                                </span>
                                <span className="text-xs text-gray-500">{item.confidence}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              {/* AI Recommendations Section */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setRecommendationsExpanded(!recommendationsExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />🎯 AI Recommendations
                    </CardTitle>
                    {recommendationsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </CardHeader>
                {recommendationsExpanded && (
                  <CardContent className="space-y-4">
                    {categorizeRecommendations(state.analysisData.recommendations).map((category, index) => (
                      <div key={index} className={`p-4 rounded-lg border-2 ${category.color}`}>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.priority} Priority Recommendations
                        </h4>
                        <div className="space-y-2">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-start justify-between">
                              <div className="flex-1">
                                <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: formatTextWithHighlights(item.text),
                                  }}
                                />
                              </div>
                              <div className="ml-4">
                                <span className="text-xs text-gray-500">{item.confidence}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              {/* What-If Simulation */}
              <WhatIfSimulation analysisData={state.analysisData} />

              {/* Section Headers and Tables */}
              <div className="space-y-6">
                {/* Grade Level Risk Analysis Table (Second Last) */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    📊 Grade Level Analysis
                  </h2>
                  <GradeRiskTable
                    gradeRisks={state.gradeRisks}
                    isLoading={state.loading.isLoadingGradeRisks}
                    error={state.errors.gradeRiskError}
                    district={state.filters.district}
                    school={state.filters.school}
                    selectedSchool={state.selectedSchoolForGrades}
                    isGlobalView={state.ui.isGlobalView}
                    gradeFilter={state.filters.grade}
                  />
                </div>

                {/* District Schools Risk Analysis Table (Last) */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    🏫 District Schools Analysis
                  </h2>
                  <DistrictSchoolsRiskTable
                    districtSchoolRisks={(() => {
                      // If a district is selected, show all schools in the district, even if a grade filter is applied
                      if (state.filters.district && state.fullDistrictSchoolList.length > 0) {
                        // Map the full school list to DistrictSchoolRisk, using the current districtSchoolRisks for counts
                        const mapped = state.fullDistrictSchoolList.map((school) => {
                          const found = state.districtSchoolRisks.find(
                            (r) => r.schoolName.toLowerCase().trim() === (school.label || school.value).toLowerCase().trim()
                          )
                          return {
                            schoolName: school.label || school.value,
                            riskPercentage: found ? found.riskPercentage : 0,
                            riskLevel: found ? found.riskLevel : "Low",
                            studentCount: found ? found.studentCount : 0,
                            district: school.district || state.filters.district,
                          }
                        })
                        // If a school is selected, filter the mapped array
                        if (state.filters.school) {
                          const selectedLabel =
                            state.options.schoolOptions.find((opt) => opt.value === state.filters.school)?.label ||
                            state.filters.school
                          return mapped.filter(
                            (s) => s.schoolName.toLowerCase().trim() === selectedLabel.toLowerCase().trim()
                          )
                        }
                        return mapped
                      }
                      // Otherwise, use the current districtSchoolRisks
                      return state.districtSchoolRisks
                    })()}
                    isLoading={state.loading.isProcessingAI}
                    error={null}
                    district={state.filters.district}
                    isGlobalView={state.ui.isGlobalView}
                    onSchoolClick={handleSchoolClick}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertsDashboard
