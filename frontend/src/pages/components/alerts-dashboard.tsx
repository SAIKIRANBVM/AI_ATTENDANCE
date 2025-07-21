"use client"

import React, { useState, useEffect, useReducer, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import {
  AlertCircle,
  Download,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Brain,
  BarChart3,
  Target,
  Sparkles,
  Activity,
  Loader2,
  Play,
  Pause,
  Bell,
  BellOff,
  Search,
  ChevronLeft,
  ChevronRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Import Card components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// All interfaces remain exactly the same
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
  riskLevel?: string
  // Keep backward compatibility with old property names
  SCHOOL_NAME?: string
  DISTRICT_NAME?: string
}

interface GradeRisk {
  grade: string | number
  grade_level?: number // For backward compatibility
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
  // For backward compatibility
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
  isLoadingGradeRisks: boolean // For tracking grade risks loading state
}

interface ErrorState {
  generalError: string | null
  downloadError: string | null
  gradeRiskError: string | null // For tracking grade risks errors
}

interface UIState {
  isGlobalView: boolean
  showFilters: boolean
}

// Interface for grade risk items
interface GradeRiskItem {
  grade: string
  risk_percentage: number
  student_count: number
}

// New interfaces for District Schools
interface DistrictSchool {
  schoolName: string
  riskPercentage: number
  riskLevel: "Critical" | "High" | "Medium" | "Low"
  studentCount: number
}

// New interfaces for notification system
interface NotificationSettings {
  enabled: boolean
  history: AlertNotification[]
}

interface AppState {
  filters: FilterState
  options: OptionsState
  loading: LoadingState
  errors: ErrorState
  ui: UIState
  analysisData: AnalysisData | null
  loadTimer: NodeJS.Timeout | null
  gradeRisks: GradeRiskItem[] // Array of grade risk data
  districtSchools: DistrictSchool[] // Array of district schools data
  notificationSettings: NotificationSettings
}

// New interfaces for What-If Simulation
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
  | { type: "SET_DISTRICT_SCHOOLS"; payload: DistrictSchool[] }
  | { type: "SET_NOTIFICATION_SETTINGS"; payload: Partial<NotificationSettings> }

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
  },
  analysisData: null,
  loadTimer: null,
  gradeRisks: [],
  districtSchools: [],
  notificationSettings: {
    enabled: typeof window !== "undefined" ? localStorage.getItem("notifications-enabled") !== "false" : true,
    history: [],
  },
}

interface AlertNotification {
  id: string
  title: string
  description: string
  type: "info" | "warning" | "success" | "error"
  timestamp: Date
}

interface NotificationTemplate {
  id: string
  title: string
  description: (data: AnalysisData) => string
  type: "info" | "warning" | "success" | "error"
}

// Enhanced categorization logic for insights
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
  const radius = outerRadius + 30 // Position labels outside the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // Don't show label if value is 0 or very small
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

// Enhanced Notification Controls Component
const NotificationControls: React.FC<{
  settings: NotificationSettings
  onToggle: () => void
  onClearHistory: () => void
}> = ({ settings, onToggle, onClearHistory }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {settings.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {settings.history.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {settings.history.length > 9 ? "9+" : settings.history.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            <Button variant="ghost" size="sm" onClick={onToggle} className="text-xs">
              {settings.enabled ? "Turn Off" : "Turn On"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {settings.enabled ? "Showing all popup notifications" : "Only critical alerts will show"}
          </p>
        </div>

        {settings.history.length > 0 ? (
          <>
            <div className="max-h-64 overflow-y-auto">
              {settings.history
                .slice(-10)
                .reverse()
                .map((notification) => (
                  <div key={notification.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.type === "error"
                            ? "bg-red-500"
                            : notification.type === "warning"
                              ? "bg-yellow-500"
                              : notification.type === "success"
                                ? "bg-green-500"
                                : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearHistory} className="text-center justify-center">
              Clear History
            </DropdownMenuItem>
          </>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Grade Risk Table Component (Enhanced)
const GradeRiskTable: React.FC<{
  gradeRisks: GradeRiskItem[]
  isLoading: boolean
  error: string | null
  district: string
  school: string
  isGlobalView: boolean
}> = ({ gradeRisks, isLoading, error, district, school, isGlobalView }) => {
  const totalStudents = gradeRisks.reduce((sum, item) => sum + item.student_count, 0)
  const averageRisk =
    gradeRisks.length > 0 ? gradeRisks.reduce((sum, item) => sum + item.risk_percentage, 0) / gradeRisks.length : 0

  const getRiskColor = (risk: number) => {
    if (risk >= 30) return "bg-red-100 text-red-800 border-red-200"
    if (risk >= 15) return "bg-orange-100 text-orange-800 border-orange-200"
    return "bg-yellow-100 text-yellow-800 border-yellow-200"
  }

  const getRiskLevel = (risk: number) => {
    if (risk >= 30) return "Critical"
    if (risk >= 15) return "High"
    if (risk >= 5) return "Medium"
    return "Low"
  }

  // Sort grades in proper order (PK, K, 1, 2, 3, etc.)
  const sortedGradeRisks = [...gradeRisks].sort((a, b) => {
    const gradeA = a.grade.toString().toLowerCase()
    const gradeB = b.grade.toString().toLowerCase()

    // Handle special cases
    if (gradeA === "pk") return -1
    if (gradeB === "pk") return 1
    if (gradeA === "k") return gradeB === "pk" ? 1 : -1
    if (gradeB === "k") return gradeA === "pk" ? -1 : 1

    // Handle numeric grades
    const numA = Number.parseInt(gradeA)
    const numB = Number.parseInt(gradeB)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }

    // Fallback to string comparison
    return gradeA.localeCompare(gradeB)
  })

  const shouldShow = isGlobalView || district || school

  if (!shouldShow) {
    return null
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">📊 Grade Level Risk Analysis</CardTitle>
          <div className="text-xs text-blue-100">
            {isGlobalView ? "Global View" : school ? `${school}` : district ? `${district}` : "All"}
          </div>
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

        {!isLoading && !error && sortedGradeRisks.length > 0 && (
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
                      Number of Students
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedGradeRisks.map((gradeRisk, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        Grade {gradeRisk.grade}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                gradeRisk.risk_percentage >= 30
                                  ? "bg-red-500"
                                  : gradeRisk.risk_percentage >= 15
                                    ? "bg-orange-500"
                                    : "bg-yellow-500"
                              }`}
                              style={{ width: `${Math.min(100, gradeRisk.risk_percentage)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{gradeRisk.risk_percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge
                          variant={
                            gradeRisk.risk_percentage >= 30
                              ? "destructive"
                              : gradeRisk.risk_percentage >= 15
                                ? "secondary"
                                : "default"
                          }
                          className={
                            gradeRisk.risk_percentage >= 30
                              ? "bg-red-100 text-red-800 border-red-200"
                              : gradeRisk.risk_percentage >= 15
                                ? "bg-orange-100 text-orange-800 border-orange-200"
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }
                        >
                          {getRiskLevel(gradeRisk.risk_percentage)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-700">
                        {gradeRisk.student_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isLoading && !error && sortedGradeRisks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              {!isGlobalView && !district && !school
                ? "Select a district or school to view grade-level risks"
                : "No grade risk data available for the selected filters"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// New District Schools Risk Table Component
const DistrictSchoolsRiskTable: React.FC<{
  schools: DistrictSchool[]
  isLoading: boolean
  error: string | null
  district: string
  isGlobalView: boolean
  onSchoolClick: (schoolName: string) => void
}> = ({ schools, isLoading, error, district, isGlobalView, onSchoolClick }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"risk" | "name" | "students">("risk")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const itemsPerPage = 10

  // Filter and sort schools
  const filteredSchools = schools.filter((school) => school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()))

  const sortedSchools = [...filteredSchools].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "risk":
        comparison = a.riskPercentage - b.riskPercentage
        break
      case "name":
        comparison = a.schoolName.localeCompare(b.schoolName)
        break
      case "students":
        comparison = a.studentCount - b.studentCount
        break
    }
    return sortOrder === "desc" ? -comparison : comparison
  })

  // Pagination
  const totalPages = Math.ceil(sortedSchools.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSchools = sortedSchools.slice(startIndex, startIndex + itemsPerPage)

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

  const handleSort = (column: "risk" | "name" | "students") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder(column === "risk" ? "desc" : "asc")
    }
    setCurrentPage(1)
  }

  const shouldShow = isGlobalView || district

  if (!shouldShow) {
    return null
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">🏫 District Schools Risk Analysis</CardTitle>
          <div className="text-xs text-blue-100">{isGlobalView ? "All Districts" : district || "Select District"}</div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <AIProcessingAnimation isProcessing={true} message="Loading district schools data..." type="loading" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Error loading district schools: {error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && schools.length > 0 && (
          <>
            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                Showing {paginatedSchools.length} of {sortedSchools.length} schools
              </div>
            </div>

            {/* Schools Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>School Name</span>
                        {sortBy === "name" && (
                          <ChevronUp className={`h-3 w-3 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("risk")}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>Risk Percentage</span>
                        {sortBy === "risk" && (
                          <ChevronUp className={`h-3 w-3 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("students")}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Number of Students</span>
                        {sortBy === "students" && (
                          <ChevronUp className={`h-3 w-3 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 hover:text-blue-600">
                        {school.schoolName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                school.riskPercentage >= 30
                                  ? "bg-red-500"
                                  : school.riskPercentage >= 15
                                    ? "bg-orange-500"
                                    : school.riskPercentage >= 5
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(100, school.riskPercentage)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{school.riskPercentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge variant="outline" className={getRiskLevelColor(school.riskLevel)}>
                          {school.riskLevel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-700">
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
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && schools.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              {!isGlobalView && !district ? "Select a district to view schools risk analysis" : "No schools found"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Global Risk Overview Card Component
const GlobalRiskOverviewCard: React.FC<{
  analysisData: AnalysisData | null
  isGlobalView: boolean
}> = ({ analysisData, isGlobalView }) => {
  if (!isGlobalView || !analysisData) {
    return null
  }

  const totalStudents = analysisData.summaryStatistics.totalStudents
  const atRiskStudents = analysisData.summaryStatistics.tier4Students + analysisData.summaryStatistics.tier3Students
  const overallRiskPercentage = totalStudents > 0 ? (atRiskStudents / totalStudents) * 100 : 0

  const getRiskLevelFromPercentage = (percentage: number) => {
    if (percentage >= 30) return { level: "Critical", color: "bg-red-100 text-red-800 border-red-200" }
    if (percentage >= 15) return { level: "High", color: "bg-orange-100 text-orange-800 border-orange-200" }
    if (percentage >= 5) return { level: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" }
    return { level: "Low", color: "bg-green-100 text-green-800 border-green-200" }
  }

  const riskInfo = getRiskLevelFromPercentage(overallRiskPercentage)

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          🌍 Global Risk Overview
          <Badge variant="secondary" className="bg-white/20 text-white">
            System-wide
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-800 mb-2">{totalStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-orange-800 mb-2">{atRiskStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">At-Risk Students</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="text-3xl font-bold text-purple-800 mr-2">{overallRiskPercentage.toFixed(1)}%</div>
              <Badge className={riskInfo.color}>{riskInfo.level}</Badge>
            </div>
            <div className="text-sm text-gray-600">Overall Risk Level</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${
                overallRiskPercentage >= 30
                  ? "bg-red-500"
                  : overallRiskPercentage >= 15
                    ? "bg-orange-500"
                    : overallRiskPercentage >= 5
                      ? "bg-yellow-500"
                      : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, overallRiskPercentage)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>Risk Percentage</span>
            <span>100%</span>
          </div>
        </div>
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
            impact: Math.min(30, Math.max(-20, Math.floor((strategy.successRate - 0.5) * 40))), // Wider range for strategy impact
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
            // Strategy can have positive or negative impact based on success rate
            strategyImpact = Math.floor((strategy.successRate - 0.5) * 6) // -3% to +3% impact
          }
        }

        // Clamp the total improvement between -50% and +50%
        const effectiveImprovement = Math.max(-50, Math.min(50, improvement + strategyImpact))

        const improvedStudents = Math.floor(currentStudents * (effectiveImprovement / 100))
        return {
          tier,
          currentStudents,
          improvedStudents,
          improvementPercentage: effectiveImprovement,
          strategyImpact,
          projectedStudents: Math.max(0, currentStudents - improvedStudents), // Ensure we don't go below 0
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
        suggestion.impact + ((prev[`tier${tier}Improvement` as keyof typeof prev] as number) || 0),
      ),
    }))
  }

  const getAiRecommendation = (tier: number) => {
    const suggestions = aiSuggestions[`tier${tier}` as keyof typeof aiSuggestions]
    if (!suggestions || suggestions.length === 0) return null

    return suggestions[0] // Return top suggestion
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
  ].filter((item) => item.value > 0) // Only show non-zero values

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
                        +{totalImprovedStudents.toLocaleString()} students
                      </div>
                      <div className="text-sm text-gray-500">
                        ({overallImprovementPercentage > 0 ? "+" : ""}
                        {overallImprovementPercentage.toFixed(1)}% change)
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

// Fixed Alerts and Notifications Component
const AlertsNotifications: React.FC<{
  data: AnalysisData | null
  notificationSettings: NotificationSettings
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void
}> = ({ data, notificationSettings, onUpdateSettings }): JSX.Element | null => {
  const [notifications, setNotifications] = React.useState<
    Array<{
      id: string
      title: string
      description: string
      type: "info" | "warning" | "success" | "error"
      timestamp: Date
    }>
  >([])
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
  const showToast = (notification: {
    id: string
    title: string
    description: string
    type: "info" | "warning" | "success" | "error"
    timestamp: Date
  }): void => {
    if (!notificationSettings.enabled || isPaused) return

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
      },
      {
        id: "high-risk-students",
        title: "High-Risk Students Alert",
        description: (data) => {
          const total = data.summaryStatistics.totalStudents || 1 // Avoid division by zero
          const percentage = (data.summaryStatistics.tier4Students / total) * 100
          return `${data.summaryStatistics.tier4Students.toLocaleString()} students (${percentage.toFixed(1)}%) are in the high-risk category (Tier 4)`
        },
        type: "error" as const,
      },
      {
        id: "tier3-opportunity",
        title: "Improvement Opportunity",
        description: (data) =>
          `${data.summaryStatistics.tier3Students?.toLocaleString() || "N/A"} students are in Tier 3 (80-85% attendance) and could improve with intervention`,
        type: "warning" as const,
      },
      {
        id: "top-performing-schools",
        title: "Top Performing Schools",
        description: (data) => {
          if (!data.alertsNotifications?.bySchool?.length) return "No school data available"
          const topSchool = [...data.alertsNotifications.bySchool].sort((a, b) => a.count - b.count)[0]
          return `${topSchool.school} has the lowest number of at-risk students (${topSchool.count})`
        },
        type: "success" as const,
      },
      {
        id: "attendance-trend",
        title: "Attendance Trend",
        description: (data) => {
          const totalAtRisk = data.alertsNotifications?.totalBelow60 || 0
          const totalStudents = data.summaryStatistics.totalStudents || 1 // Avoid division by zero
          const atRiskPercentage = (totalAtRisk / totalStudents) * 100
          return `${atRiskPercentage.toFixed(1)}% of students are at risk (below 60% attendance)`
        },
        type: "info" as const,
      },
      {
        id: "grade-specific-alert",
        title: "Grade-Specific Alert",
        description: (data) => {
          if (!data.alertsNotifications?.byGrade?.length) return "No grade data available"
          const highestRisk = data.alertsNotifications.byGrade.sort((a, b) => (b.count || 0) - (a.count || 0))[0]
          const grade =
            highestRisk.grade !== undefined
              ? highestRisk.grade
              : highestRisk.grade_level !== undefined
                ? highestRisk.grade_level
                : "N/A"
          return `Grade ${grade} has the highest risk with ${highestRisk.count} students below 60% attendance`
        },
        type: "warning" as const,
      },
      {
        id: "district-comparison",
        title: "District Comparison",
        description: (data) => {
          if (!data.alertsNotifications?.byDistrict?.length) return "No district data available"
          const districts = data.alertsNotifications.byDistrict.sort((a, b) => b.count - a.count)
          return `Top district by at-risk students: ${districts[0]?.district || "N/A"} (${districts[0]?.count || "N/A"}) vs ${districts[1]?.district || "others"} (${districts[1]?.count || "N/A"})`
        },
        type: "info" as const,
      },
      {
        id: "attendance-milestone",
        title: "Attendance Milestone",
        description: (data) =>
          `Great job! ${data.summaryStatistics.tier1Students?.toLocaleString() || "N/A"} students maintain excellent attendance (95%+)`,
        type: "success" as const,
      },
      {
        id: "chronic-absenteeism",
        title: "Chronic Absenteeism Warning",
        description: (data) => {
          const chronicCount = data.summaryStatistics.tier4Students
          return `${chronicCount} students (${((chronicCount / Math.max(1, data.summaryStatistics.totalStudents)) * 100).toFixed(1)}%) are chronically absent (missed 10%+ of school days)`
        },
        type: "error" as const,
      },
      {
        id: "goal-progress",
        title: "Attendance Goal Progress",
        description: (data) => {
          const currentRate = (
            ((data.summaryStatistics.totalStudents - data.summaryStatistics.below85Students) /
              Math.max(1, data.summaryStatistics.totalStudents)) *
            100
          ).toFixed(1)
          return `Current attendance rate: ${currentRate}% - ${Number.parseFloat(currentRate) > 85 ? "Meeting" : "Below"} district goal of 85%`
        },
        type: "info" as const,
      },
    ],
    [],
  )

  // Function to get the next notification in the cycle
  const getNextNotification = React.useCallback(
    (
      data: AnalysisData,
    ): {
      id: string
      title: string
      description: string
      type: "info" | "warning" | "success" | "error"
      timestamp: Date
    } | null => {
      if (!data) return null

      const template = notificationTemplates[currentNotificationIndex.current % notificationTemplates.length]
      currentNotificationIndex.current++

      return {
        id: `${template.id}-${Date.now()}`,
        title: template.title,
        description: template.description(data),
        type: template.type,
        timestamp: new Date(),
      }
    },
    [notificationTemplates],
  )

  // Process data and generate notifications
  React.useEffect(() => {
    if (!data || !notificationSettings.enabled || isPaused) {
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

    // Initial notification
    const initialNotification = getNextNotification(data)
    if (initialNotification) {
      setNotifications((prev) => [...prev.slice(-9), initialNotification])
      onUpdateSettings({
        history: [...notificationSettings.history.slice(-9), initialNotification],
      })
      showToast(initialNotification)
    }

    // Set up interval for recurring notifications (every 8-12 seconds)
    notificationInterval.current = setInterval(
      () => {
        if (!isPaused && notificationSettings.enabled) {
          const nextNotification = getNextNotification(data)
          if (nextNotification) {
            setNotifications((prev) => [...prev.slice(-9), nextNotification])
            onUpdateSettings({
              history: [...notificationSettings.history.slice(-9), nextNotification],
            })
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
  }, [
    data,
    getNextNotification,
    notificationSettings.enabled,
    isPaused,
    onUpdateSettings,
    notificationSettings.history,
  ])

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
    onUpdateSettings({ history: [] })
    toast.info("All notifications cleared")
  }

  // Don't render anything if there's no data
  if (!data) return null

  // Determine if we should show the section or not
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
            marginTop: "60px", // Ensure it appears below any fixed headers
          },
        }}
      />

      {/* Only render the section if there are notifications OR if paused with message */}
      {(hasNotifications || shouldShowPausedMessage) && (
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
                        <AlertTitle className="text-sm font-medium">{notification.title}</AlertTitle>
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
    case "SET_DISTRICT_SCHOOLS":
      return {
        ...state,
        districtSchools: action.payload,
      }
    case "SET_NOTIFICATION_SETTINGS":
      return {
        ...state,
        notificationSettings: { ...state.notificationSettings, ...action.payload },
      }
    default:
      return state
  }
}

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
  // First, handle the entire line by making the first part bold
  // This will make everything before the first colon bold, if a colon exists
  let formattedText = text.replace(/^([^:]+)(:)/, '<strong class="font-semibold text-gray-900">$1</strong>:')

  // If no colon was found, try to make the first few words bold
  if (formattedText === text) {
    // This regex matches the first 2-5 words at the start of the string
    formattedText = text.replace(/^(\w+(?:\s+\w+){0,4}\b)/, '<strong class="font-semibold text-gray-900">$1</strong>')
  }

  // Still highlight percentages in teal
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
          grade: grade, // Store just the number as string or number
          count: 0, // Default count
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

// Mock function to generate district schools data
const generateMockDistrictSchools = (analysisData: AnalysisData | null, district: string): DistrictSchool[] => {
  if (!analysisData || !district) return []

  // Generate mock schools for the selected district
  const schoolNames = [
    "Lincoln Elementary",
    "Washington Middle",
    "Roosevelt High",
    "Jefferson Elementary",
    "Madison Middle",
    "Monroe High",
    "Adams Elementary",
    "Jackson Middle",
    "Van Buren Elementary",
    "Harrison High",
    "Tyler Middle",
    "Polk Elementary",
  ]

  return schoolNames
    .map((name, index) => {
      const riskPercentage = Math.random() * 40 // 0-40% risk
      const getRiskLevel = (risk: number): "Critical" | "High" | "Medium" | "Low" => {
        if (risk >= 30) return "Critical"
        if (risk >= 15) return "High"
        if (risk >= 5) return "Medium"
        return "Low"
      }

      return {
        schoolName: name,
        riskPercentage: Math.round(riskPercentage * 10) / 10,
        riskLevel: getRiskLevel(riskPercentage),
        studentCount: Math.floor(Math.random() * 800) + 200, // 200-1000 students
      }
    })
    .sort((a, b) => b.riskPercentage - a.riskPercentage) // Sort by risk percentage descending
}

const createOptionKey = (prefix: string, value: string, index?: number, additional?: string): string => {
  return `${prefix}-${additional || "none"}-${value}${index !== undefined ? `-${index}` : ""}`
}

const AlertsDashboard: React.FC = () => {
  console.log("Rendering AlertsDashboard component");
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(true);
  const { token, ready } = useAuth();
  const authReady = ready && !!token;

  console.log("Auth state:", { token: !!token, ready, authReady });

  useEffect(() => {
    setAuthToken(token);
  }, [authReady, token]);

  // Handle notification settings updates
  const handleNotificationSettingsUpdate = useCallback((settings: Partial<NotificationSettings>) => {
    dispatch({ type: "SET_NOTIFICATION_SETTINGS", payload: settings });
    
    // Save to localStorage
    if (settings.enabled !== undefined) {
      localStorage.setItem('notifications-enabled', settings.enabled.toString());
    }
  }, []);

  // Handle notification toggle
  const handleNotificationToggle = useCallback(() => {
    const newEnabled = !state.notificationSettings.enabled;
    handleNotificationSettingsUpdate({ enabled: newEnabled });
    
    if (newEnabled) {
      toast.success("Notifications enabled");
    } else {
      toast.info("Notifications disabled - only critical alerts will show");
    }
  }, [state.notificationSettings.enabled, handleNotificationSettingsUpdate]);

  // Handle clear notification history
  const handleClearNotificationHistory = useCallback(() => {
    handleNotificationSettingsUpdate({ history: [] });
    toast.info("Notification history cleared");
  }, [handleNotificationSettingsUpdate]);

  // Handle school click in district schools table
  const handleSchoolClick = useCallback((schoolName: string) => {
    // Find the school in the options and set it as selected
    const school = state.options.schoolOptions.find(s => 
      s.label.toLowerCase().includes(schoolName.toLowerCase())
    );
    
    if (school) {
      dispatch({ type: "SET_FILTER", payload: { field: "school", value: school.value } });
      toast.info(`Selected ${schoolName} - Grade analysis will update`);
    }
  }, [state.options.schoolOptions]);

  const fetchInitialData = useCallback(async (): Promise<void> => {
    console.log("fetchInitialData called");
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, isProcessingAI: true },
    });
    dispatch({ type: "CLEAR_ERRORS" });
    console.log("Loading state set to true");

    if (state.loadTimer) {
      clearTimeout(state.loadTimer);
    }

    try {
      try {
        console.log("Fetching filter options...");
        const filterOptionsRes = await alertsService.getFilterOptions();
        console.log("Received filter options:", filterOptionsRes);
        const { districts, schools, grades } = filterOptionsRes;
        console.log("Parsed filter options:", {
          districtsCount: districts?.length,
          schoolsCount: schools?.length,
          gradesCount: grades?.length,
        });

        const formattedDistricts: DistrictOption[] = Array.isArray(districts)
          ? districts.map((d: any) => ({
              ...d,
              value: d.value.toString().replace(/^D/, ""),
              label: d.label,
            }))
          : [];

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            districtOptions: formattedDistricts,
            allSchoolOptions: schools || [],
          },
        });

        // Fixed hierarchical filter behavior
        if (state.filters.district) {
          const filteredSchools = (schools || []).filter(
            (s: SchoolOption) => s.district === state.filters.district
          );
          dispatch({
            type: "SET_OPTIONS",
            payload: { schoolOptions: filteredSchools },
          });

          if (state.filters.school) {
            const filteredGrades = (grades || []).filter(
              (g: GradeOption) => g.school === state.filters.school
            );
            dispatch({
              type: "SET_OPTIONS",
              payload: { gradeOptions: filteredGrades },
            });
          }
        }
      } catch (err) {
        console.error("Error fetching filter options:", err);
        dispatch({
          type: "SET_ERROR",
          payload: {
            generalError: "Failed to load filter options. Please try again.",
          },
        });
      }

      try {
        const searchCriteria = {
          districtCode: "",
          gradeCode: "",
          schoolCode: "",
        };
        console.log("Fetching analysis data with criteria:", searchCriteria);

        console.log("Calling getPredictionInsights...");
        const analysisRes = await alertsService.getPredictionInsights(
          searchCriteria
        );
        console.log("Received analysis data:", analysisRes);
        dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisRes });
        dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
        dispatch({ type: "SET_LOADING", payload: { isInitialLoad: false } });
        
        // Generate mock district schools for global view
        const mockDistrictSchools = generateMockDistrictSchools(analysisRes, "");
        dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: mockDistrictSchools });
        
        console.log("Analysis data set, loading complete");
      } catch (analysisErr: any) {
        console.error("Error fetching analysis:", analysisErr);
        if (!analysisErr.message?.includes("starting up")) {
          dispatch({
            type: "SET_ERROR",
            payload: {
              generalError: "Failed to load initial data. Please try again.",
            },
          });
        }
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);

      const timer = setTimeout(() => {
        fetchInitialData();
      }, 3000);

      dispatch({ type: "SET_LOAD_TIMER", payload: timer });
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      });
    }
  }, [state.loadTimer, state.filters.district, state.filters.school]);

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
        });
        dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: [] });
        return;
      }

      try {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: true } });

        const filteredSchools = await alertsService.getSchoolsByDistrict({
          district: district,
        });

        const schoolsWithKeys: SchoolOption[] = filteredSchools.map(
          (school: any, index: number) => ({
            ...school,
            key: `school-${school.value}-${district}-${index}`,
            location_id: school.location_id || school.value.split("-").pop(),
            district: district,
          })
        );

        dispatch({
          type: "SET_OPTIONS",
          payload: {
            schoolOptions: schoolsWithKeys,
            gradeOptions: [], // Clear grades when district changes
          },
        });

        // Generate mock district schools data for the selected district
        const mockDistrictSchools = generateMockDistrictSchools(state.analysisData, district);
        dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: mockDistrictSchools });

        // Reset school and grade if current school is not valid for new district
        const currentSchoolValid =
          state.filters.school &&
          schoolsWithKeys.some(
            (s: SchoolOption) => s.value === state.filters.school
          );

        if (state.filters.school && !currentSchoolValid) {
          dispatch({
            type: "SET_FILTER",
            payload: { field: "school", value: "" },
          });
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          });
        }
      } catch (error) {
        console.error("Error fetching schools for district:", error);
        dispatch({
          type: "SET_OPTIONS",
          payload: { schoolOptions: [], gradeOptions: [] },
        });
        dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: [] });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "school", value: "" },
        });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: false } });
      }
    },
    [state.filters.school, state.analysisData]
  );

  // Fixed fetchGradesForSchool with proper hierarchical behavior
  const fetchGradesForSchool = useCallback(
    async (school: string, district: string): Promise<void> => {
      if (!school || !district) {
        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: [] },
        });
        return;
      }

      try {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: true } });

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
        });

        const schoolCode = extractSchoolCode(school);

        console.log("Fetching grades for:", {
          originalSchool: school,
          extractedSchoolCode: schoolCode,
          district: district,
        });

        const gradesData = await alertsService.getGradesBySchool({
          school: school,
          district: district,
        });

        const formattedGrades: GradeOption[] = gradesData.map((g: any) => ({
          value: g.value.toString(),
          label: g.label || `Grade ${g.value}`,
          school: school,
          district: district,
        }));

        dispatch({
          type: "SET_OPTIONS",
          payload: { gradeOptions: formattedGrades },
        });

        // Reset grade if current grade is not valid for new school
        if (
          state.filters.grade &&
          !formattedGrades.some((g) => g.value === state.filters.grade)
        ) {
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          });
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
        if (school === state.filters.school) {
          dispatch({
            type: "SET_OPTIONS",
            payload: { gradeOptions: [] },
          });
          dispatch({
            type: "SET_FILTER",
            payload: { field: "grade", value: "" },
          });
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: { isProcessingAI: false } });
      }
    },
    [state.filters.grade, state.filters.school]
  );

  const fetchAnalysisData = useCallback(async (): Promise<
    AnalysisData | undefined
  > => {
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, isProcessingAI: true },
    });
    dispatch({ type: "CLEAR_ERRORS" });
    dispatch({ type: "SET_UI", payload: { isGlobalView: false } });

    try {
      const searchCriteria: SearchCriteria = createSearchCriteria(
        state.filters
      );

      console.log(
        "Sending request to prediction-insights with data:",
        JSON.stringify(searchCriteria, null, 2)
      );

      const analysisData = await alertsService.getPredictionInsights(
        searchCriteria
      );

      console.log("Received response:", analysisData);

      dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
      dispatch({ type: "CLEAR_ERRORS" });
      
      // Generate mock district schools for the current filter
      const mockDistrictSchools = generateMockDistrictSchools(analysisData, state.filters.district);
      dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: mockDistrictSchools });
      
      return analysisData;
    } catch (err: any) {
      console.error("Error fetching analysis:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      dispatch({
        type: "SET_ERROR",
        payload: { generalError: errorMessage },
      });
      throw err;
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      });
    }
  }, [state.filters]);

  const handleDownloadReport = useCallback(async (reportType: string): Promise<void> => {
    try {
      dispatch({
        type: "SET_LOADING",
        payload: { isDownloadingReport: true, isProcessingAI: true },
      });
      dispatch({ type: "SET_ERROR", payload: { downloadError: null } });

      const downloadCriteria: DownloadCriteria = {
        ...createSearchCriteria(state.filters),
        reportType: reportType,
      };

      console.log("Download criteria:", downloadCriteria);

      const blob = await alertsService.downloadReport(
        reportType,
        downloadCriteria
      );

      const filename = alertsService.generateReportFilename(reportType);
      alertsService.triggerDownload(blob, filename);
      toast.success("Report downloaded successfully!");
    } catch (err: any) {
      console.error("Error in downloadReport:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      dispatch({
        type: "SET_ERROR",
        payload: {
          downloadError: `Error downloading report: ${errorMessage}`,
        },
      });
      toast.error("Failed to download report");
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isDownloadingReport: false, isProcessingAI: false },
      });
    }
  }, [state.filters]);

  const resetFiltersAndFetchGlobal = useCallback(async (): Promise<void> => {
    try {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: true, isProcessingAI: true },
      });
      dispatch({ type: "CLEAR_ERRORS" });
      dispatch({ type: "RESET_FILTERS" });
      dispatch({
        type: "SET_OPTIONS",
        payload: { schoolOptions: [], gradeOptions: [] },
      });

      const searchCriteria = {
        districtCode: "",
        gradeCode: "",
        schoolCode: "",
      };

      const [analysisData, schoolsData] = await Promise.all([
        // First promise - fetch analysis data
        alertsService.getPredictionInsights(createSearchCriteria(state.filters)),
        
        // Second promise - fetch schools if needed
        state.filters.district
          ? alertsService.getSchoolsByDistrict({ district: state.filters.district })
          : Promise.resolve([])
      ]);
      
      // Update state with the fetched data
      dispatch({ type: "SET_ANALYSIS_DATA", payload: analysisData });
      dispatch({ type: "SET_UI", payload: { isGlobalView: true } });
      dispatch({ type: "CLEAR_ERRORS" });
      
      // Generate mock district schools for global view
      const mockDistrictSchools = generateMockDistrictSchools(analysisData, "");
      dispatch({ type: "SET_DISTRICT_SCHOOLS", payload: mockDistrictSchools });
      
    } catch (err: any) {
      console.error("Error in resetFiltersAndFetchGlobal:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      dispatch({
        type: "SET_ERROR",
        payload: { generalError: errorMessage },
      });
      throw err;
    } finally {
      dispatch({
        type: "SET_LOADING",
        payload: { isLoading: false, isProcessingAI: false },
      });
    }
    },
    [state.filters]
  );

  // Function to fetch grade risk data
  const fetchGradeRisks = useCallback(async () => {
    const { district, school } = state.filters;
    
    // For global view, generate some mock data
    if (state.ui.isGlobalView) {
      const mockGradeRisks: GradeRiskItem[] = [
        { grade: "PK", risk_percentage: 12.5, student_count: 1250 },
        { grade: "K", risk_percentage: 15.2, student_count: 1800 },
        { grade: "1", risk_percentage: 18.7, student_count: 1750 },
        { grade: "2", risk_percentage: 16.3, student_count: 1680 },
        { grade: "3", risk_percentage: 14.8, student_count: 1720 },
        { grade: "4", risk_percentage: 13.2, student_count: 1650 },
        { grade: "5", risk_percentage: 11.9, student_count: 1580 },
        { grade: "6", risk_percentage: 19.4, student_count: 1620 },
        { grade: "7", risk_percentage: 22.1, student_count: 1590 },
        { grade: "8", risk_percentage: 24.6, student_count: 1540 },
        { grade: "9", risk_percentage: 28.3, student_count: 1480 },
        { grade: "10", risk_percentage: 31.7, student_count: 1420 },
        { grade: "11", risk_percentage: 29.8, student_count: 1380 },
        { grade: "12", risk_percentage: 26.4, student_count: 1320 },
      ];
      dispatch({ type: "SET_GRADE_RISKS", payload: mockGradeRisks });
      return;
    }
    
    // Only fetch if we have both district and school selected
    if (!district && !school) {
      dispatch({ type: "SET_GRADE_RISKS", payload: [] });
      return;
    }

    try {
      dispatch({ type: "SET_GRADE_RISKS_LOADING", payload: true });
      dispatch({ type: "SET_GRADE_RISKS_ERROR", payload: null });

      const response: GradeRiskResponse = await alertsService.getGradeRisks(
        state.filters.district,
        state.filters.school
      );
      
      // Map the API response to match our GradeRiskItem interface
      const gradeRisks = response.grades.map(grade => ({
        grade: grade.grade,
        risk_percentage: grade.risk_percentage,
        student_count: grade.student_count
      }));
      
      dispatch({ type: "SET_GRADE_RISKS", payload: gradeRisks });
    } catch (error) {
      console.error("Error fetching grade risks:", error);
      dispatch({ 
        type: "SET_GRADE_RISKS_ERROR", 
        payload: "Failed to load grade risk data" 
      });
    } finally {
      dispatch({ type: "SET_GRADE_RISKS_LOADING", payload: false });
    }
  }, [state.filters.district, state.filters.school, state.ui.isGlobalView]);

  // Fetch grade risks when district or school changes
  useEffect(() => {
    fetchGradeRisks();
  }, [fetchGradeRisks]);

  // Fixed handleFilterChange with proper hierarchical behavior
  const handleFilterChange = useCallback(
    (field: keyof FilterState, value: string) => {
      if (field === "district" && value !== state.filters.district) {
        // When district changes, reset school and grade
        dispatch({ type: "SET_FILTER", payload: { field: "district", value } });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "school", value: "" },
        });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      } else if (field === "school" && value !== state.filters.school) {
        // When school changes, reset grade
        dispatch({ type: "SET_FILTER", payload: { field: "school", value } });
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      } else {
        dispatch({ type: "SET_FILTER", payload: { field, value } });
      }
    },
    [state.filters.district, state.filters.school]
  );

  const handleToggleFilters = useCallback(() => {
    dispatch({
      type: "SET_UI",
      payload: { showFilters: !state.ui.showFilters },
    });
  }, [state.ui.showFilters]);

  useEffect(() => {
    console.log("useEffect - authReady changed:", { authReady });
    if (!authReady) {
      console.log("authReady is false, not fetching data yet");
      return;
    }
    console.log("authReady is true, fetching initial data");
    fetchInitialData();

    return () => {
      if (state.loadTimer) {
        clearTimeout(state.loadTimer);
      }
    };
  }, [authReady, state.loadTimer]);

  useEffect(() => {
    fetchSchoolsForDistrict(state.filters.district);
  }, [state.filters.district, fetchSchoolsForDistrict]);

  useEffect(() => {
    if (state.filters.school && state.filters.district) {
      fetchGradesForSchool(state.filters.school, state.filters.district);
    } else {
      dispatch({
        type: "SET_OPTIONS",
        payload: { gradeOptions: [] },
      });
      if (state.filters.grade) {
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        });
      }
    }
  }, [state.filters.school, state.filters.district, fetchGradesForSchool]);

  const LoadingSkeletonCards: React.FC = () => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="animate-pulse h-32">
          <CardHeader className="pb-2">
            <div className="h-5 bg-gray-200 rounded w-24"></div>\
