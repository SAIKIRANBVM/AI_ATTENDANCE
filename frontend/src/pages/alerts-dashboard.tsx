"use client"

import React, { useState, useEffect, useReducer, useCallback } from "react"
import {
  AlertCircle,
  Download,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Brain,
  Target,
  Loader2,
  Play,
  Pause,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"
import { setAuthToken } from "@/lib/axios"
import alertsService, { type GradeRiskResponse } from "@/services/alerts.service"
import { toast, Toaster } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Import all types
import type {
  DistrictOption,
  SchoolOption,
  GradeOption,
  AnalysisData,
  AlertNotification,
  NotificationTemplate,
  FilterState,
} from "./types/dashboard-types"

// Import all utilities
import {
  useDebounce,
  appReducer,
  processDistrictCode,
  extractSchoolCode,
  createSearchCriteria,
  extractErrorMessage,
  formatTextWithHighlights,
  createOptionKey,
  generateDistrictSchoolRisks,
  getRiskLevel,
  categorizeInsights,
  categorizeRecommendations,
} from "./utils/dashboard-utils"

// Import all UI components
import {
  AIProcessingAnimation,
  CustomPieLabel,
  NotificationToggle,
  GlobalRiskOverviewCard,
  LoadingSkeletonCards,
  ReportDownloadingModal,
} from "./components/ui-components"

// Import data table components
import { GradeRiskTable, DistrictSchoolsRiskTable } from "./components/data-tables"

// Import simulation component
import { WhatIfSimulation } from "./components/what-if-simulation"

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

const AlertsDashboard: React.FC = () => {
  console.log("Rendering AlertsDashboard component")
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [insightsExpanded, setInsightsExpanded] = useState(true)
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(true)
  const [notificationHistory, setNotificationHistory] = useState<AlertNotification[]>([])
  const { token, ready } = useAuth()
  const authReady = ready && !!token

  // Reduce debounce delay for smoother updates
  const debouncedDistrict = useDebounce(state.filters.district, 150)
  const debouncedSchool = useDebounce(state.filters.school, 150)
  const debouncedGrade = useDebounce(state.filters.grade, 150)

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
          (s) => s.school.toLowerCase().trim() === (school.label || school.value).toLowerCase().trim(),
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
      dispatch({
        type: "SET_DISTRICT_SCHOOL_RISKS",
        payload: globalSchoolRisks,
      })
    } else {
      dispatch({ type: "SET_DISTRICT_SCHOOL_RISKS", payload: [] })
    }
  }, [
    state.analysisData,
    state.filters.district,
    state.filters.grade,
    state.fullDistrictSchoolList,
    state.ui.isGlobalView,
  ])

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
        dispatch({ type: "SET_FULL_DISTRICT_SCHOOL_LIST", payload: [] })
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
        dispatch({
          type: "SET_FULL_DISTRICT_SCHOOL_LIST",
          payload: schoolsWithKeys,
        })

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
        dispatch({ type: "SET_FULL_DISTRICT_SCHOOL_LIST", payload: [] })
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
      const searchCriteria = {
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

        const downloadCriteria = {
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
  }, [state.analysisData, state.ui.isGlobalView])

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
        dispatch({
          type: "SET_FILTER",
          payload: { field: "school", value: "" },
        })
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        })
        dispatch({ type: "SET_SELECTED_SCHOOL_FOR_GRADES", payload: null })

        // Clear existing options immediately for better UX
        dispatch({
          type: "SET_OPTIONS",
          payload: { schoolOptions: [], gradeOptions: [] },
        })
      } else if (field === "school" && value !== state.filters.school) {
        // When school changes, reset grade immediately
        dispatch({ type: "SET_FILTER", payload: { field: "school", value } })
        dispatch({
          type: "SET_FILTER",
          payload: { field: "grade", value: "" },
        })
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
            <Button
              variant="outline"
              size="sm"
              disabled={state.loading.isDownloadingReport}
              className="w-full bg-transparent"
            >
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
                            (r) =>
                              r.schoolName.toLowerCase().trim() === (school.label || school.value).toLowerCase().trim(),
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
                            (s) => s.schoolName.toLowerCase().trim() === selectedLabel.toLowerCase().trim(),
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
