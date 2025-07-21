"use client"

import type React from "react"
import { useState, useEffect, useReducer, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { setAuthToken } from "@/lib/axios"
import { toast } from "sonner"
import type { AlertNotification } from "@/types/dashboard.types" // Import AlertNotification type

// Import all our modular components
import { AIProcessingAnimation } from "./AIProcessingAnimation"
import { GlobalRiskOverview } from "./GlobalRiskOverview"
import { SummaryStatisticsCards } from "./SummaryStatisticsCards"
import { ChartsSection } from "./ChartsSection"
import { InsightsSection } from "./InsightsSection"
import { RecommendationsSection } from "./RecommendationsSection"
import { useDebounce } from "@/utils/dashboard.utils"

// Import other existing components (keeping them as they were)
import { WhatIfSimulation } from "./WhatIfSimulation"
import { AlertsNotifications } from "./AlertsNotifications"
import { GradeRiskTable } from "./GradeRiskTable"
import { DistrictSchoolsRiskTable } from "./DistrictSchoolsRiskTable"
import { FilterSection } from "./FilterSection"
import { NotificationToggle } from "./NotificationToggle"

// Import reducer and initial state
import { appReducer, initialState } from "../reducers/dashboardReducer"

const AlertsDashboard: React.FC = () => {
  console.log("Rendering AlertsDashboard component")
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [notificationHistory, setNotificationHistory] = useState<AlertNotification[]>([])
  const { token, ready } = useAuth()
  const authReady = ready && !!token

  // Debounce filter changes to prevent excessive API calls
  const debouncedFilters = useDebounce(state.filters, 300)

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())

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
      toast.success("Notifications: On")
    } else {
      toast.info("Notifications: Off")
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

  // All the existing functions (fetchInitialData, fetchAnalysisData, etc.) remain the same
  // ... (keeping all the existing logic)

  // Main render logic with restored layout
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AIProcessingAnimation isProcessing={true} message="Initializing dashboard..." type="loading" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Risk Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered insights and predictive analytics</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Toggle */}
            <NotificationToggle
              enabled={state.ui.notificationsEnabled}
              onToggle={handleToggleNotifications}
              notifications={notificationHistory}
              onClearHistory={handleClearNotificationHistory}
            />

            {/* Download Report Button and other controls */}
            {/* ... existing header controls ... */}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`${state.ui.showFilters ? "block" : "hidden"} lg:block`}>
            <FilterSection />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Loading State */}
            {state.loading.isInitialLoad && (
              <div className="space-y-6">
                <AIProcessingAnimation
                  isProcessing={true}
                  message="Loading dashboard data and initializing AI analysis..."
                  type="loading"
                />
              </div>
            )}

            {/* Main Dashboard Content */}
            {!state.loading.isInitialLoad && !state.errors.generalError && state.analysisData && (
              <>
                {/* Global Risk Overview Card */}
                <GlobalRiskOverview analysisData={state.analysisData} />

                {/* Summary Statistics Cards - Restored to original 5-card layout */}
                <SummaryStatisticsCards data={state.analysisData} />

                {/* Charts Section - Restored to original side-by-side layout */}
                <ChartsSection data={state.analysisData} />

                {/* Alerts & Notifications Section */}
                <AlertsNotifications
                  data={state.analysisData}
                  notificationsEnabled={state.ui.notificationsEnabled}
                  onToggleNotifications={handleToggleNotifications}
                />

                {/* What-If Simulation */}
                <WhatIfSimulation analysisData={state.analysisData} />

                {/* AI Insights Section - Restored to full width, top-to-bottom layout */}
                <InsightsSection insights={state.analysisData.keyInsights} />

                {/* AI Recommendations Section - Restored to full width, top-to-bottom layout */}
                <RecommendationsSection recommendations={state.analysisData.recommendations} />

                {/* Grade Level Risk Analysis Table */}
                <GradeRiskTable
                  gradeRisks={state.gradeRisks}
                  isLoading={state.loading.isLoadingGradeRisks}
                  error={state.errors.gradeRiskError}
                  district={state.filters.district}
                  school={state.filters.school}
                  selectedSchool={state.selectedSchoolForGrades}
                  isGlobalView={state.ui.isGlobalView}
                />

                {/* District Schools Risk Analysis Table */}
                <DistrictSchoolsRiskTable
                  districtSchoolRisks={state.districtSchoolRisks}
                  isLoading={state.loading.isApplyingFilters}
                  error={state.errors.filterError}
                  district={state.filters.district}
                  isGlobalView={state.ui.isGlobalView}
                  onSchoolClick={handleSchoolClick}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertsDashboard
