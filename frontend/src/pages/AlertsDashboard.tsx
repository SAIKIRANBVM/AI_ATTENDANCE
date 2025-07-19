"use client";

import React, { useState, useEffect, useReducer, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
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
  Cpu,
  Play,
  Pause,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { setAuthToken } from "@/lib/axios";
import alertsService, { GradeRiskResponse } from "@/services/alerts.service";
import { toast, Toaster } from "sonner";
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
} from "recharts";

// Import Card components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// All interfaces remain exactly the same
interface DistrictOption {
  value: string;
  label: string;
}

interface SchoolOption {
  value: string;
  label: string;
  district?: string;
  location_id?: string;
  key?: string;
}

interface GradeOption {
  value: string;
  label: string;
  school?: string;
  district?: string;
}

interface SummaryStatistics {
  totalStudents: number;
  below85Students: number;
  tier1Students: number;
  tier2Students: number;
  tier3Students: number;
  tier4Students: number;
}

interface InsightItem {
  text?: string;
  insight?: string;
}

interface RecommendationItem {
  text?: string;
  recommendation?: string;
}

interface PrioritySchool {
  schoolName: string;
  district: string;
  riskPercentage: number;
}

interface GradeRisk {
  grade: string;
  riskPercentage: number;
}

interface AnalysisData {
  summaryStatistics: SummaryStatistics;
  keyInsights: Array<string | InsightItem>;
  recommendations: Array<string | RecommendationItem>;
  alertsNotifications?: {
    totalBelow60: number;
    byDistrict: Array<{ district: string; count: number }>;
    bySchool: Array<{ school: string; count: number }>;
    byGrade: Array<{ grade: string; count: number }>;
  };
}

interface ApiErrorResponse {
  detail?: string;
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    headers?: Record<string, any>;
  };
  request?: any;
  message?: string;
}

interface SearchCriteria {
  districtCode?: string;
  gradeCode?: string;
  schoolCode?: string;
}

interface DownloadCriteria extends SearchCriteria {
  reportType?: string;
}

interface FilterState {
  district: string;
  school: string;
  grade: string;
}

interface OptionsState {
  districtOptions: DistrictOption[];
  schoolOptions: SchoolOption[];
  gradeOptions: GradeOption[];
  allSchoolOptions: SchoolOption[];
}

interface LoadingState {
  isLoading: boolean;
  isInitialLoad: boolean;
  isDownloadingReport: boolean;
  isProcessingAI: boolean;
  isLoadingGradeRisks: boolean;  // For tracking grade risks loading state
}

interface ErrorState {
  generalError: string | null;
  downloadError: string | null;
  gradeRiskError: string | null;  // For tracking grade risks errors
}

interface UIState {
  isGlobalView: boolean;
  showFilters: boolean;
}

// Interface for grade risk items
interface GradeRiskItem {
  grade: string;
  risk_percentage: number;
  student_count: number;
}

interface AppState {
  filters: FilterState;
  options: OptionsState;
  loading: LoadingState;
  errors: ErrorState;
  ui: UIState;
  analysisData: AnalysisData | null;
  loadTimer: NodeJS.Timeout | null;
  gradeRisks: GradeRiskItem[];  // Array of grade risk data
}

// New interfaces for What-If Simulation
interface SimulationState {
  tier1Improvement: number;
  tier2Improvement: number;
  tier3Improvement: number;
  tier4Improvement: number;
  isProcessing: boolean;
  isExpanded: boolean;
}

interface ProjectedOutcome {
  tier: number;
  currentStudents: number;
  improvedStudents: number;
  improvementPercentage: number;
  strategyImpact?: number;
  projectedStudents: number;
}

interface ComparisonData {
  name: string;
  current: number;
  projected: number;
  color: string;
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
  | { type: "SET_GRADE_RISKS_ERROR"; payload: string | null };

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
};

interface AlertNotification {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: Date;
}

interface NotificationTemplate {
  id: string;
  title: string;
  description: (data: AnalysisData) => string;
  type: "info" | "warning" | "success" | "error";
}

// Enhanced categorization logic for insights
interface CategorizedInsight {
  category: string;
  icon: string;
  color: string;
  items: Array<{
    text: string;
    confidence: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

interface CategorizedRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  color: string;
  items: Array<{
    text: string;
    confidence: number;
  }>;
}

// Enhanced AI Processing Animation Component
const AIProcessingAnimation: React.FC<{
  isProcessing: boolean;
  message?: string;
  type?: "loading" | "downloading" | "processing";
}> = ({ isProcessing, message = "Processing", type = "processing" }) => {
  if (!isProcessing) return null;

  const getIcon = () => {
    switch (type) {
      case "downloading":
        return <Download className="w-4 h-4 text-blue-600 animate-bounce" />;
      case "loading":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Brain className="w-4 h-4 text-blue-600 animate-pulse" />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case "downloading":
        return "Generating Report";
      case "loading":
        return "Loading Dashboard";
      default:
        return "AI Processing";
    }
  };

  return (
    <div className="flex items-center justify-center space-x-3 py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse"></div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-sm font-semibold text-blue-700">
            {getMessage()}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">{message}</div>
      </div>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    </div>
  );
};

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
};

// Custom label component for pie chart
const CustomPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  index,
  name,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Position labels outside the pie
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Don't show label if value is 0 or very small
  if (value === 0 || value < 1) return null;

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
  );
};

// Grade Risk Table Component
const GradeRiskTable: React.FC<{
  gradeRisks: GradeRiskItem[];
  isLoading: boolean;
  error: string | null;
  district: string;
  school: string;
}> = ({ gradeRisks, isLoading, error, district, school }) => {
  const totalStudents = gradeRisks.reduce(
    (sum, item) => sum + item.student_count,
    0
  );
  const averageRisk =
    gradeRisks.length > 0
      ? gradeRisks.reduce((sum, item) => sum + item.risk_percentage, 0) /
        gradeRisks.length
      : 0;

  const getRiskColor = (risk: number) => {
    if (risk >= 30) return "bg-red-100 text-red-800 border-red-200";
    if (risk >= 15) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <CardHeader className="bg-[#03787c] text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            📊 Grade-Level Risk Analysis
          </CardTitle>
          {(district || school) && (
            <div className="text-xs text-blue-100">
              {school ? `${school}` : district ? `${district}` : "All"}
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

            {/* Grade Risk Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade Level
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gradeRisks.map((gradeRisk, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        Grade {gradeRisk.grade}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                        {gradeRisk.student_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRiskColor(
                            gradeRisk.risk_percentage
                          )}`}
                        >
                          {gradeRisk.risk_percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isLoading && !error && gradeRisks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              {district || school
                ? "No grade risk data available for the selected filters"
                : "Select a district or school to view grade-level risks"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
// What-If Simulation Component with AI Enhancements and Fixed Charts
const WhatIfSimulation: React.FC<{ analysisData: AnalysisData | null }> = ({
  analysisData,
}) => {
  const [simulation, setSimulation] = useState<SimulationState>({
    tier1Improvement: 0,
    tier2Improvement: 0,
    tier3Improvement: 0,
    tier4Improvement: 0,
    isProcessing: false,
    isExpanded: true,
  });

  const [aiSuggestions, setAiSuggestions] = useState<{
    tier1: { name: string; confidence: number; impact: number }[];
    tier2: { name: string; confidence: number; impact: number }[];
    tier3: { name: string; confidence: number; impact: number }[];
    tier4: { name: string; confidence: number; impact: number }[];
  }>({
    tier1: [],
    tier2: [],
    tier3: [],
    tier4: [],
  });

  const [selectedStrategies, setSelectedStrategies] = useState<
    Record<string, string>
  >({});

  const [projectedOutcomes, setProjectedOutcomes] = useState<
    ProjectedOutcome[]
  >([]);

  // Calculate projected outcomes with AI enhancements
  useEffect(() => {
    if (!analysisData) return;

    const calculateOutcomes = () => {
      // Generate AI suggestions if not already generated
      if (aiSuggestions.tier1.length === 0) {
        const newAiSuggestions = { ...aiSuggestions };
        [1, 2, 3, 4].forEach((tier) => {
          const strategies =
            AI_STRATEGIES[`tier${tier}` as keyof typeof AI_STRATEGIES];
          newAiSuggestions[`tier${tier}` as keyof typeof newAiSuggestions] =
            strategies.map((strategy) => ({
              name: strategy.name,
              confidence: Math.min(
                95,
                Math.max(
                  60,
                  Math.floor(strategy.successRate * 100) +
                    Math.floor(Math.random() * 10)
                )
              ),
              impact: Math.min(
                30,
                Math.max(-20, Math.floor((strategy.successRate - 0.5) * 40))
              ), // Wider range for strategy impact
            }));
        });
        setAiSuggestions(newAiSuggestions);
      }

      // Calculate outcomes with AI-enhanced predictions
      const outcomes: ProjectedOutcome[] = [1, 2, 3, 4].map((tier) => {
        const tierKey = `tier${tier}` as keyof typeof simulation;
        const improvement = simulation[
          `${tierKey}Improvement` as keyof typeof simulation
        ] as number;
        const currentStudents =
          analysisData.summaryStatistics[
            `tier${tier}Students` as keyof SummaryStatistics
          ] || 0;

        // Apply AI strategy impact if selected
        const selectedStrategy = selectedStrategies[`tier${tier}`];
        let strategyImpact = 0;
        if (selectedStrategy) {
          const strategy = AI_STRATEGIES[
            `tier${tier}` as keyof typeof AI_STRATEGIES
          ].find((s) => s.name === selectedStrategy);
          if (strategy) {
            // Strategy can have positive or negative impact based on success rate
            strategyImpact = Math.floor((strategy.successRate - 0.5) * 6); // -3% to +3% impact
          }
        }

        // Clamp the total improvement between -50% and +50%
        const effectiveImprovement = Math.max(
          -50,
          Math.min(50, improvement + strategyImpact)
        );

        const improvedStudents = Math.floor(
          currentStudents * (effectiveImprovement / 100)
        );
        return {
          tier,
          currentStudents,
          improvedStudents,
          improvementPercentage: effectiveImprovement,
          strategyImpact,
          projectedStudents: Math.max(0, currentStudents - improvedStudents), // Ensure we don't go below 0
        };
      });

      setProjectedOutcomes(outcomes);
    };

    // Simulate AI processing
    setSimulation((prev) => ({ ...prev, isProcessing: true }));
    const timer = setTimeout(() => {
      calculateOutcomes();
      setSimulation((prev) => ({ ...prev, isProcessing: false }));
    }, 800);

    return () => clearTimeout(timer);
  }, [
    simulation.tier1Improvement,
    simulation.tier2Improvement,
    simulation.tier3Improvement,
    simulation.tier4Improvement,
    analysisData,
  ]);

  const handleSliderChange = (tier: number, value: number[]) => {
    const improvement = value[0];
    setSimulation((prev) => ({
      ...prev,
      [`tier${tier}Improvement`]: improvement,
    }));
  };

  const resetSimulation = () => {
    setSimulation((prev) => ({
      ...prev,
      tier1Improvement: 0,
      tier2Improvement: 0,
      tier3Improvement: 0,
      tier4Improvement: 0,
    }));
    setSelectedStrategies({});
  };

  const applyAiSuggestion = (
    tier: number,
    suggestion: { name: string; impact: number }
  ) => {
    setSelectedStrategies((prev) => ({
      ...prev,
      [`tier${tier}`]: suggestion.name,
    }));

    setSimulation((prev) => ({
      ...prev,
      [`tier${tier}Improvement`]: Math.min(
        10,
        suggestion.impact +
          ((prev[`tier${tier}Improvement` as keyof typeof prev] as number) || 0)
      ),
    }));
  };

  const getAiRecommendation = (tier: number) => {
    const suggestions =
      aiSuggestions[`tier${tier}` as keyof typeof aiSuggestions];
    if (!suggestions || suggestions.length === 0) return null;

    return suggestions[0]; // Return top suggestion
  };

  const totalImprovedStudents = projectedOutcomes.reduce(
    (sum, outcome) => sum + outcome.improvedStudents,
    0
  );
  const totalStudents = analysisData?.summaryStatistics.totalStudents || 1;
  const overallImprovementPercentage =
    (totalImprovedStudents / totalStudents) * 100;

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return "bg-green-50 border-green-200 text-green-800";
      case 2:
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case 3:
        return "bg-amber-50 border-amber-200 text-amber-800";
      case 4:
        return "bg-orange-50 border-orange-200 text-orange-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return "Tier 1 (≥95%)";
      case 2:
        return "Tier 2 (90-95%)";
      case 3:
        return "Tier 3 (80-90%)";
      case 4:
        return "Tier 4 (<80%)";
      default:
        return `Tier ${tier}`;
    }
  };

  if (!analysisData) return null;

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
  ].filter((item) => item.value > 0); // Only show non-zero values

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
      <CardHeader
        className="bg-[#03787c] text-white cursor-pointer hover:bg-[#026266] transition-all duration-300"
        onClick={() =>
          setSimulation((prev) => ({ ...prev, isExpanded: !prev.isExpanded }))
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                ✨ What-If Simulation
              </CardTitle>
              <p className="text-blue-100 text-sm">
                AI-Powered Improvement Scenarios
              </p>
              <p className="text-xs text-gray-500 italic">
                Simulated outcomes are estimates and may vary based on actual
                implementation.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              <span className="text-xs font-medium">Interactive</span>
            </div>
            {simulation.isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
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
              <div
                key={tier}
                className={`p-4 rounded-lg border-2 ${getTierColor(tier)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-sm">
                    {getTierLabel(tier)} Improvement
                  </label>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span className="font-bold text-lg">
                      {
                        simulation[
                          `tier${tier}Improvement` as keyof SimulationState
                        ]
                      }
                      %
                    </span>
                  </div>
                </div>
                <Slider
                  value={[
                    simulation[
                      `tier${tier}Improvement` as keyof SimulationState
                    ] as number,
                  ]}
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
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Current At-Risk Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {projectedOutcomes
                          .reduce((sum, tier) => sum + tier.currentStudents, 0)
                          .toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-green-400 bg-green-50 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Projected Improvement
                      </CardTitle>
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
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Projected At-Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {projectedOutcomes
                          .reduce(
                            (sum, tier) => sum + tier.projectedStudents,
                            0
                          )
                          .toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {overallImprovementPercentage > 0 ? "↓" : "↑"}
                        {Math.abs(overallImprovementPercentage).toFixed(1)}%
                        from current
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparison Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Bar Chart */}
                  <Card className="border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        📊 Before & After Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: "Tier 1",
                              current:
                                projectedOutcomes[0]?.currentStudents || 0,
                              projected:
                                projectedOutcomes[0]?.projectedStudents || 0,
                              color: "#10b981",
                            },
                            {
                              name: "Tier 2",
                              current:
                                projectedOutcomes[1]?.currentStudents || 0,
                              projected:
                                projectedOutcomes[1]?.projectedStudents || 0,
                              color: "#059669",
                            },
                            {
                              name: "Tier 3",
                              current:
                                projectedOutcomes[2]?.currentStudents || 0,
                              projected:
                                projectedOutcomes[2]?.projectedStudents || 0,
                              color: "#d97706",
                            },
                            {
                              name: "Tier 4",
                              current:
                                projectedOutcomes[3]?.currentStudents || 0,
                              projected:
                                projectedOutcomes[3]?.projectedStudents || 0,
                              color: "#ea580c",
                            },
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                          />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: number) => [
                              value.toLocaleString(),
                              "Students",
                            ]}
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
                      <CardTitle className="text-sm font-medium">
                        📈 Risk Distribution
                      </CardTitle>
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
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [
                                value.toLocaleString(),
                                "Students",
                              ]}
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
                            <p className="text-gray-500 text-sm">
                              No data to display
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Tier-wise Breakdown
                </h4>
                <div className="space-y-4">
                  {projectedOutcomes.map((outcome) => {
                    const suggestion = getAiRecommendation(outcome.tier);
                    const isStrategySelected =
                      selectedStrategies[`tier${outcome.tier}`];

                    return (
                      <div
                        key={outcome.tier}
                        className={`p-4 rounded-lg border-2 ${getTierColor(
                          outcome.tier
                        )}`}
                      >
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
                              Current:{" "}
                              {outcome.currentStudents.toLocaleString()}{" "}
                              students
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              +{outcome.improvedStudents.toLocaleString()}
                            </div>
                            <div className="text-xs">
                              {outcome.improvementPercentage}% improvement
                              {outcome.strategyImpact
                                ? ` (includes +${outcome.strategyImpact}% from strategy)`
                                : ""}
                            </div>
                          </div>
                        </div>

                        {/* AI Recommendation */}
                        {suggestion && !isStrategySelected && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-xs font-medium text-blue-800">
                                  AI Suggests:
                                </div>
                                <div className="text-sm">{suggestion.name}</div>
                                <div className="text-xs text-blue-600">
                                  Estimated impact: +{suggestion.impact}%
                                  improvement
                                  <span className="ml-2 text-blue-500">
                                    (Confidence: {suggestion.confidence}%)
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  applyAiSuggestion(outcome.tier, suggestion)
                                }
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
                                <div className="text-xs font-medium text-green-800">
                                  Active Strategy:
                                </div>
                                <div className="text-sm">
                                  {isStrategySelected}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newStrategies = {
                                    ...selectedStrategies,
                                  };
                                  delete newStrategies[`tier${outcome.tier}`];
                                  setSelectedStrategies(newStrategies);
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="flex-1">
              <p className="text-xs text-gray-500 italic">
                Recommendations based on attendance risk level and
                evidence-based interventions. Simulated impact is an estimate,
                not a guaranteed outcome.
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
  );
};

// Helper functions for categorization
const categorizeInsights = (
  insights: Array<string | InsightItem>
): CategorizedInsight[] => {
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
  };

  insights.forEach((insight) => {
    const text = getTextFromItem(insight);
    const textLower = text.toLowerCase();

    // Generate confidence score based on text characteristics
    const confidence = generateConfidence(text);
    const priority = generatePriority(text);

    const item = { text, confidence, priority };

    if (textLower.includes("predict") || textLower.includes("forecast")) {
      categories.predictive.items.push(item);
    } else if (
      textLower.includes("pattern") ||
      textLower.includes("trend") ||
      textLower.includes("correlate")
    ) {
      categories.pattern.items.push(item);
    } else if (
      textLower.includes("behavior") ||
      textLower.includes("engagement")
    ) {
      categories.behavioral.items.push(item);
    } else if (
      textLower.includes("tier") ||
      textLower.includes("intervention")
    ) {
      categories.tier.items.push(item);
    } else {
      categories.general.items.push(item);
    }
  });

  return Object.values(categories).filter((cat) => cat.items.length > 0);
};

const categorizeRecommendations = (
  recommendations: Array<string | RecommendationItem>
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
  };

  recommendations.forEach((rec) => {
    const text = getTextFromItem(rec);
    const textLower = text.toLowerCase();
    const confidence = generateConfidence(text);

    const item = { text, confidence };

    if (
      textLower.includes("urgent") ||
      textLower.includes("critical") ||
      textLower.includes("immediate") ||
      textLower.includes("priority")
    ) {
      priorities.HIGH.items.push(item);
    } else if (
      textLower.includes("consider") ||
      textLower.includes("improve") ||
      textLower.includes("enhance")
    ) {
      priorities.MEDIUM.items.push(item);
    } else {
      priorities.LOW.items.push(item);
    }
  });

  return Object.values(priorities).filter((cat) => cat.items.length > 0);
};

const generateConfidence = (text: string): number => {
  // Simple confidence scoring based on text characteristics
  let score = 70; // Base score

  if (text.includes("%")) score += 10;
  if (text.includes("students")) score += 5;
  if (text.includes("data") || text.includes("analysis")) score += 8;
  if (text.length > 100) score += 5;
  if (text.includes("recommend") || text.includes("suggest")) score += 7;

  return Math.min(95, Math.max(60, score));
};

const generatePriority = (text: string): "HIGH" | "MEDIUM" | "LOW" => {
  const textLower = text.toLowerCase();

  if (
    textLower.includes("critical") ||
    textLower.includes("urgent") ||
    textLower.includes("risk")
  ) {
    return "HIGH";
  } else if (
    textLower.includes("consider") ||
    textLower.includes("improve") ||
    textLower.includes("focus")
  ) {
    return "MEDIUM";
  }
  return "LOW";
};

// Fixed Alerts and Notifications Component
const AlertsNotifications: React.FC<{ data: AnalysisData | null }> = ({
  data,
}): JSX.Element | null => {
  const [notifications, setNotifications] = React.useState<
    Array<{
      id: string;
      title: string;
      description: string;
      type: "info" | "warning" | "success" | "error";
      timestamp: Date;
    }>
  >([]);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [isPaused, setIsPaused] = React.useState(false);
  const notificationInterval = React.useRef<NodeJS.Timeout | null>(null);
  const currentNotificationIndex = React.useRef(0);

  // Helper function to get appropriate icon for each alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Function to show a single toast notification at the top only
  const showToast = (notification: {
    id: string;
    title: string;
    description: string;
    type: "info" | "warning" | "success" | "error";
    timestamp: Date;
  }): void => {
    if (!notificationsEnabled || isPaused) return;

    const toastOptions = {
      duration: 6000,
      position: "top-right" as const,
      action: {
        label: "Dismiss",
        onClick: () => {},
      },
    };

    switch (notification.type) {
      case "error":
        toast.error(notification.title, {
          ...toastOptions,
          description: notification.description,
        });
        break;
      case "warning":
        toast.warning(notification.title, {
          ...toastOptions,
          description: notification.description,
        });
        break;
      case "success":
        toast.success(notification.title, {
          ...toastOptions,
          description: notification.description,
        });
        break;
      default:
        toast(notification.title, {
          ...toastOptions,
          description: notification.description,
        });
    }
  };

  // Notification templates that will be cycled through
  const notificationTemplates = React.useMemo<NotificationTemplate[]>(
    () => [
      {
        id: "low-attendance-students",
        title: "Low Attendance Alert",
        description: (data) => {
          if (!data.alertsNotifications) return "No attendance data available";
          return `${data.alertsNotifications.totalBelow60.toLocaleString()} students have predicted attendance below 60%`;
        },
        type: "error" as const,
      },
      {
        id: "district-risk",
        title: "District Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.byDistrict?.length)
            return "No district data available";
          const highestRiskDistrict = data.alertsNotifications.byDistrict.sort(
            (a, b) => b.count - a.count
          )[0];
          return `${
            highestRiskDistrict.district
          } has ${highestRiskDistrict.count.toLocaleString()} students below 60% attendance`;
        },
        type: "warning" as const,
      },
      {
        id: "school-risk",
        title: "School Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.bySchool?.length)
            return "No school data available";
          const highestRiskSchool = data.alertsNotifications.bySchool.sort(
            (a, b) => b.count - a.count
          )[0];
          return `${
            highestRiskSchool.school
          } has ${highestRiskSchool.count.toLocaleString()} students below 60% attendance`;
        },
        type: "warning" as const,
      },
      {
        id: "grade-risk",
        title: "Grade Level Risk Alert",
        description: (data) => {
          if (!data.alertsNotifications?.byGrade?.length)
            return "No grade data available";
          const highestRiskGrade = data.alertsNotifications.byGrade.sort(
            (a, b) => b.count - a.count
          )[0];
          return `Grade ${
            highestRiskGrade.grade
          } has ${highestRiskGrade.count.toLocaleString()} students below 60% attendance`;
        },
        type: "warning" as const,
      },
      {
        id: "total-students",
        title: "Total Attendance Overview",
        description: (data) =>
          `Total Students: ${
            data.summaryStatistics.totalStudents?.toLocaleString() || "N/A"
          }`,
        type: "info" as const,
      },
      {
        id: "tier1-students",
        title: "Tier 1 Attendance (≥95%)",
        description: (data) =>
          `${
            data.summaryStatistics.tier1Students?.toLocaleString() || "N/A"
          } students`,
        type: "success" as const,
      },
      {
        id: "tier4-students",
        title: "Tier 4 Attendance (<80%)",
        description: (data) =>
          `${
            data.summaryStatistics.tier4Students?.toLocaleString() || "N/A"
          } students`,
        type: "error" as const,
      },
    ],
    []
  );

  // Function to get the next notification in the cycle
  const getNextNotification = React.useCallback(
    (
      data: AnalysisData
    ): {
      id: string;
      title: string;
      description: string;
      type: "info" | "warning" | "success" | "error";
      timestamp: Date;
    } | null => {
      if (!data) return null;

      const template =
        notificationTemplates[
          currentNotificationIndex.current % notificationTemplates.length
        ];
      currentNotificationIndex.current++;

      return {
        id: `${template.id}-${Date.now()}`,
        title: template.title,
        description: template.description(data),
        type: template.type,
        timestamp: new Date(),
      };
    },
    [notificationTemplates]
  );

  // Process data and generate notifications
  React.useEffect(() => {
    if (!data || !notificationsEnabled || isPaused) {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
        notificationInterval.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (notificationInterval.current) {
      clearInterval(notificationInterval.current);
    }

    // Initial notification
    const initialNotification = getNextNotification(data);
    if (initialNotification) {
      setNotifications((prev) => [...prev.slice(-9), initialNotification]);
      showToast(initialNotification);
    }

    // Set up interval for recurring notifications (every 8-12 seconds)
    notificationInterval.current = setInterval(() => {
      if (!isPaused && notificationsEnabled) {
        const nextNotification = getNextNotification(data);
        if (nextNotification) {
          setNotifications((prev) => [...prev.slice(-9), nextNotification]);
          showToast(nextNotification);
        }
      }
    }, Math.floor(Math.random() * 4000) + 8000); // Random interval between 8-12 seconds

    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
      }
    };
  }, [data, getNextNotification, notificationsEnabled, isPaused]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
      }
    };
  }, []);

  const handleToggleNotifications = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) {
      toast.info("Notifications paused");
    } else {
      toast.success("Notifications resumed");
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.info("All notifications cleared");
  };

  // Don't render anything if there's no data
  if (!data) return null;

  // Determine if we should show the section or not
  const hasNotifications = notifications.length > 0;
  const shouldShowPausedMessage = isPaused && !hasNotifications;

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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleClearAll}
                >
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs flex items-center gap-1 ${
                  isPaused
                    ? "text-orange-600 hover:text-orange-700"
                    : "text-green-600 hover:text-green-700"
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
                  Notifications are currently paused. Resume to see the
                  notifications.
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
                    variant={
                      notification.type === "error" ? "destructive" : "default"
                    }
                    className="cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        {getAlertIcon(notification.type)}
                      </div>
                      <div className="ml-3">
                        <AlertTitle className="text-sm font-medium">
                          {notification.title}
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                          {notification.description}
                        </AlertDescription>
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
  );
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.field]: action.payload.value,
        },
      };
    case "RESET_FILTERS":
      return {
        ...state,
        filters: { district: "", school: "", grade: "" },
      };
    case "SET_OPTIONS":
      return {
        ...state,
        options: { ...state.options, ...action.payload },
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, ...action.payload },
      };
    case "CLEAR_ERRORS":
      return {
        ...state,
        errors: { generalError: null, downloadError: null, gradeRiskError: null },
      };
    case "SET_UI":
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };
    case "SET_ANALYSIS_DATA":
      return {
        ...state,
        analysisData: action.payload,
      };
    case "SET_LOAD_TIMER":
      return {
        ...state,
        loadTimer: action.payload,
      };
    case "SET_GRADE_RISKS":
      return {
        ...state,
        gradeRisks: action.payload,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: null },
      };
    case "SET_GRADE_RISKS_LOADING":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: action.payload },
      };
    case "SET_GRADE_RISKS_ERROR":
      return {
        ...state,
        loading: { ...state.loading, isLoadingGradeRisks: false },
        errors: { ...state.errors, gradeRiskError: action.payload },
      };
    default:
      return state;
  }
};

const processDistrictCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined;
  return /^D\d+$/.test(code) ? code.substring(1) : code;
};

const extractSchoolCode = (schoolValue: string): string => {
  if (!schoolValue) return "";
  return schoolValue.includes("-")
    ? schoolValue.split("-").pop() || schoolValue
    : schoolValue;
};

const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
  districtCode: filters.district ? processDistrictCode(filters.district) : "",
  gradeCode: filters.grade || "",
  schoolCode: filters.school ? extractSchoolCode(filters.school) : "",
});

const extractErrorMessage = (error: ApiError): string => {
  if (error.response) {
    if (error.response.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response.status === 404) {
      return "No data found for the selected filters.";
    }
    if (error.response.status === 503) {
      return "Server is still initializing. Please try again in a moment.";
    }
  } else if (error.request) {
    return "No response from server. Please check your connection.";
  }
  return `Request error: ${error.message}`;
};

const formatTextWithHighlights = (text: string): string => {
  // First, handle the entire line by making the first part bold
  // This will make everything before the first colon bold, if a colon exists
  let formattedText = text.replace(
    /^([^:]+)(:)/,
    '<strong class="font-semibold text-gray-900">$1</strong>:'
  );

  // If no colon was found, try to make the first few words bold
  if (formattedText === text) {
    // This regex matches the first 2-5 words at the start of the string
    formattedText = text.replace(
      /^(\w+(?:\s+\w+){0,4}\b)/,
      '<strong class="font-semibold text-gray-900">$1</strong>'
    );
  }

  // Still highlight percentages in teal
  formattedText = formattedText.replace(
    /(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?%)/g,
    '<strong class="text-teal-700">$1</strong>'
  );

  return formattedText;
};

const getTextFromItem = (
  item: string | InsightItem | RecommendationItem
): string => {
  if (typeof item === "string") return item;
  if ("text" in item && item.text) return item.text;
  if ("insight" in item && item.insight) return item.insight;
  if ("recommendation" in item && item.recommendation)
    return item.recommendation;
  return "No content available";
};

const extractPrioritySchools = (
  recommendations: Array<string | RecommendationItem>
): PrioritySchool[] => {
  const schools: PrioritySchool[] = [];
  const seen = new Set<string>();

  recommendations.forEach((item) => {
    const text = getTextFromItem(item);
    const match = text.match(
      /to\s+([^,]+?)\s+in\s+([^,]+?)\s+with\s+([\d.]+)%/i
    );
    if (match) {
      const [, schoolName, district, risk] = match;
      const key = `${schoolName}-${district}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        schools.push({
          schoolName: schoolName.trim(),
          district: district.trim(),
          riskPercentage: Number.parseFloat(risk),
        });
      }
    }
  });

  return schools.sort((a, b) => b.riskPercentage - a.riskPercentage);
};

const extractGradeLevelRisks = (
  recommendations: Array<string | RecommendationItem>
): GradeRisk[] => {
  const grades: GradeRisk[] = [];
  const seen = new Set<string>();

  recommendations.forEach((item) => {
    const text = getTextFromItem(item);
    const match = text.match(/Grade\s+(\d+)[^\d]+?([\d.]+)%/i);
    if (match) {
      const [, grade, risk] = match;
      const gradeKey = `grade-${grade}`;
      if (!seen.has(gradeKey)) {
        seen.add(gradeKey);
        grades.push({
          grade: `Grade ${grade}`,
          riskPercentage: Number.parseFloat(risk),
        });
      }
    }
  });

  return grades.sort((a, b) => {
    const gradeA = Number.parseInt(a.grade.replace("Grade ", ""));
    const gradeB = Number.parseInt(b.grade.replace("Grade ", ""));
    return gradeA - gradeB;
  });
};

const createOptionKey = (
  prefix: string,
  value: string,
  index?: number,
  additional?: string
): string => {
  return `${prefix}-${additional || "none"}-${value}${
    index !== undefined ? `-${index}` : ""
  }`;
};

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
    [state.filters.school]
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
      dispatch({ type: "CLEAR_ERRORS" });
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
  }, [state.filters.district, state.filters.school]);

// ... (rest of the code remains the same)
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
            <div className="h-5 bg-gray-200 rounded w-24"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );

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
  );

  // Fixed FilterSection with proper hierarchical behavior
  const FilterSection: React.FC = () => (
    <div className="w-full lg:w-64 p-4 bg-white shadow rounded-md h-fit sticky top-4">
      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="district-select"
        >
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
            <option
              key={createOptionKey("district", d.value, index)}
              value={d.value}
            >
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="school-select"
        >
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
          disabled={
            !state.filters.district ||
            !state.options.schoolOptions.length ||
            state.loading.isInitialLoad ||
            state.loading.isProcessingAI
          }
          aria-label="Select school"
        >
          <option value="">
            {!state.filters.district
              ? "Select District First"
              : "Select School"}
          </option>
          {state.options.schoolOptions.map((s, index) => (
            <option
              key={createOptionKey("school", s.value, index, s.district)}
              value={s.value}
            >
              {s.label}
            </option>
          ))}
        </select>
        {state.loading.isProcessingAI && state.filters.district && (
          <div className="text-xs text-blue-600 mt-1 flex items-center">
            <Cpu className="w-3 h-3 mr-1 animate-pulse" />
            Loading schools...
          </div>
        )}
      </div>

      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-1"
          htmlFor="grade-select"
        >
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
          disabled={
            !state.filters.school ||
            !state.options.gradeOptions.length ||
            state.loading.isLoading ||
            state.loading.isProcessingAI
          }
          aria-label="Select grade"
        >
          <option value="">
            {!state.filters.school ? "Select School First" : "Select Grade"}
          </option>
          {state.options.gradeOptions.map((g, index) => (
            <option
              key={createOptionKey("grade", g.value, index, g.school)}
              value={g.value}
            >
              {g.label}
            </option>
          ))}
        </select>
        {state.loading.isProcessingAI && state.filters.school && (
          <div className="text-xs text-blue-600 mt-1 flex items-center">
            <Cpu className="w-3 h-3 mr-1 animate-pulse" />
            Loading grades...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={fetchAnalysisData}
          className={`bg-[#03787c] text-white px-3 py-2 rounded text-sm hover:bg-[#026266] w-full ${
            state.loading.isInitialLoad || state.loading.isProcessingAI
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          disabled={state.loading.isInitialLoad || state.loading.isProcessingAI}
          aria-label="Search for analysis data"
        >
          {state.loading.isProcessingAI ? "Processing..." : "Search"}
        </button>
        <button
          onClick={resetFiltersAndFetchGlobal}
          className={`bg-white text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-50 w-full border border-[#E9E9E9] shadow-[0_1px_2px_0_rgba(0,0,0,0.1)] ${
            state.loading.isInitialLoad || state.loading.isProcessingAI
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          disabled={state.loading.isInitialLoad || state.loading.isProcessingAI}
          aria-label="Reset all filters"
        >
          Reset
        </button>
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Download Reports</h3>
        <div className="space-y-2">
          <button
            onClick={() => handleDownloadReport("summary")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={state.loading.isDownloadingReport}
            aria-label="Download summary report"
          >
            {state.loading.isDownloadingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Summary Report
          </button>
          <button
            onClick={() => handleDownloadReport("detailed")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={state.loading.isDownloadingReport}
            aria-label="Download detailed report"
          >
            {state.loading.isDownloadingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Detailed Report
          </button>
          <button
            onClick={() => handleDownloadReport("below_85")}
            className="flex items-center gap-2 w-full text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={state.loading.isDownloadingReport}
            aria-label="Download below 85% attendance report"
          >
            {state.loading.isDownloadingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <div className="flex flex-col items-start">
              <span className="font-medium">CAR REPORT</span>
              <span className="text-xs text-gray-500">
                (Chronic Absenteeism)
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Fixed Summary Cards with proper 5-card responsive layout
   */
  const SummaryCards: React.FC = () => {
    if (!state.analysisData) return null;

    const cardConfigs = [
      {
        title: "Total Students",
        value: state.analysisData.summaryStatistics.totalStudents,
        reportType: "summary",
        icon: null,
        bgColor: "bg-blue-50",
        textColor: "text-blue-800",
      },
      {
        title: "Tier 1 (≥95%)",
        value: state.analysisData.summaryStatistics.tier1Students,
        reportType: "tier1",
        icon: null,
        bgColor: "bg-green-50",
        textColor: "text-green-800",
      },
      {
        title: "Tier 2 (90-95%)",
        value: state.analysisData.summaryStatistics.tier2Students || 0,
        reportType: "tier2",
        icon: null,
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-800",
      },
      {
        title: "Tier 3 (80-90%)",
        value: state.analysisData.summaryStatistics.tier3Students || 0,
        reportType: "tier3",
        icon: null,
        bgColor: "bg-amber-50",
        textColor: "text-amber-800",
      },
      {
        title: "Tier 4 (<80%)",
        value: state.analysisData.summaryStatistics.tier4Students,
        reportType: "tier4",
        icon: null,
        bgColor: "bg-orange-50",
        textColor: "text-orange-800",
      },
    ];

    return (
      <div className="w-full">
        {/* Responsive grid for 5 cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
          {cardConfigs.map((config, index) => (
            <Card
              key={index}
              className={`${
                config.bgColor
              } border-0 shadow-sm hover:shadow-md transition-all flex flex-col h-full min-h-[120px] ${
                // Special handling for 5th card on mobile/tablet to center it
                index === 4
                  ? "col-span-2 md:col-span-1 md:col-start-auto justify-self-center md:justify-self-auto max-w-[180px] md:max-w-none"
                  : ""
              }`}
            >
              <CardHeader className="p-3 pb-2 flex-shrink-0">
                <div className="flex items-center justify-between w-full">
                  <CardTitle
                    className={`text-xs font-medium ${config.textColor} flex-1 min-w-0 pr-2`}
                  >
                    <span className="truncate block">{config.title}</span>
                  </CardTitle>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadReport(config.reportType);
                    }}
                    className="text-xs bg-white/80 hover:bg-white text-gray-700 p-1 rounded border border-gray-200 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Download ${config.title} Report`}
                    aria-label={`Download ${config.title} report`}
                    disabled={state.loading.isDownloadingReport}
                  >
                    {state.loading.isDownloadingReport ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 flex-grow flex items-center justify-center">
                <div
                  className={`text-xl font-bold ${config.textColor} w-full text-center`}
                >
                  {config.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Enhanced Insights and Recommendations with categorization and collapsible sections
   */
  const InsightsAndRecommendations: React.FC = () => {
    if (!state.analysisData) return null;

    const categorizedInsights = categorizeInsights(
      state.analysisData.keyInsights
    );
    const categorizedRecommendations = categorizeRecommendations(
      state.analysisData.recommendations
    );
    const prioritySchools = extractPrioritySchools(
      state.analysisData.recommendations
    );
    const gradeRisks = extractGradeLevelRisks(
      state.analysisData.recommendations
    );

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case "HIGH":
          return "bg-red-100 text-red-800 border-red-200";
        case "MEDIUM":
          return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "LOW":
          return "bg-blue-100 text-blue-800 border-blue-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };

    const CollapsibleSection: React.FC<{
      title: string;
      icon: string;
      headerColor: string;
      count: number;
      expanded: boolean;
      onToggle: () => void;
      children: React.ReactNode;
      exportType?: string;
    }> = ({
      title,
      icon,
      headerColor,
      count,
      expanded,
      onToggle,
      children,
      exportType,
    }) => (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div
          className={`bg-[#03787c] text-white px-4 py-3 flex items-center justify-between cursor-pointer`}
          onClick={onToggle}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{icon}</span>
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {count} items
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {exportType && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadReport(exportType);
                }}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded transition-colors disabled:opacity-50"
                title={`Export ${title}`}
                disabled={state.loading.isDownloadingReport}
              >
                {state.loading.isDownloadingReport ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
              </button>
            )}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expanded && <div className="p-4">{children}</div>}
      </div>
    );

    return (
      <div className="w-full flex flex-col gap-5 mt-4">
        {/* Alerts and Notifications - MOVED TO FIRST POSITION */}
        <AlertsNotifications data={state.analysisData} />

        {/* Grade Risk Analysis - Prominent placement */}
        <GradeRiskTable
          gradeRisks={state.gradeRisks}
          isLoading={state.loading.isLoadingGradeRisks}
          error={state.errors.gradeRiskError}
          district={state.filters.district}
          school={state.filters.school}
        />

        {/* What-If Simulation - Now comes after alerts */}
        <WhatIfSimulation analysisData={state.analysisData} />

        {/* AI-Powered Insights */}
        <CollapsibleSection
          title="AI-Powered Insights"
          icon="💡"
          headerColor="bg-blue-600"
          count={state.analysisData.keyInsights.length}
          expanded={insightsExpanded}
          onToggle={() => setInsightsExpanded(!insightsExpanded)}
          exportType="insights"
        >
          <div className="space-y-4">
            {categorizedInsights.map((category, categoryIndex) => (
              <div
                key={categoryIndex}
                className={`${category.color} rounded-lg p-4 border`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">{category.icon}</span>
                  <h4 className="font-medium text-gray-800">
                    {category.category}
                  </h4>
                  <span className="bg-white/60 px-2 py-1 rounded-full text-xs text-gray-600">
                    {category.items.length} insights
                  </span>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="bg-white/50 border border-white/60 rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="bg-gray-700 text-white px-2 py-1 rounded-full text-xs font-medium">
                              #{itemIndex + 1}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                                item.priority
                              )}`}
                            >
                              {item.priority === "HIGH"
                                ? "🔥"
                                : item.priority === "MEDIUM"
                                ? "⚡"
                                : "💡"}{" "}
                              {item.priority}
                            </span>
                          </div>
                          <p
                            className="text-sm text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: formatTextWithHighlights(item.text),
                            }}
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
                            ✅ {item.confidence}% Confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Smart Recommendations */}
        <CollapsibleSection
          title="Smart Recommendations"
          icon="✅"
          headerColor="bg-green-600"
          count={state.analysisData.recommendations.length}
          expanded={recommendationsExpanded}
          onToggle={() => setRecommendationsExpanded(!recommendationsExpanded)}
          exportType="recommendations"
        >
          <div className="space-y-4">
            {categorizedRecommendations.map((priorityGroup, groupIndex) => (
              <div
                key={groupIndex}
                className={`${priorityGroup.color} rounded-lg p-4 border`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">{priorityGroup.icon}</span>
                  <h4 className="font-medium text-gray-800">
                    {priorityGroup.priority} Priority
                  </h4>
                  <span className="bg-white/60 px-2 py-1 rounded-full text-xs text-gray-600">
                    {priorityGroup.items.length} recommendations
                  </span>
                </div>
                <div className="space-y-3">
                  {priorityGroup.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="bg-white/50 border border-white/60 rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="bg-gray-700 text-white px-2 py-1 rounded-full text-xs font-medium">
                              #{itemIndex + 1}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                                priorityGroup.priority
                              )}`}
                            >
                              {priorityGroup.icon} {priorityGroup.priority}
                            </span>
                          </div>
                          <p
                            className="text-sm text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: formatTextWithHighlights(item.text),
                            }}
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
                            ✅ {item.confidence}% Confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Priority Schools and Grade Risk Tables */}
        <div className="grid grid-cols-1 gap-5">
          {/* Priority Schools Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#03787c] text-white px-4 h-11 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Priority Schools & Districts
              </h3>
            </div>
            <div className="p-4">
              {prioritySchools.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          School Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          District
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prioritySchools.map((school, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {school.schoolName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {school.district}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                school.riskPercentage >= 80
                                  ? "bg-red-100 text-red-800"
                                  : school.riskPercentage >= 50
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {school.riskPercentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No priority schools data available
                </p>
              )}
            </div>
          </div>

          {/* Grade Risk Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#03787c] text-white px-4 h-11 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Grade-Level Critical Risk
              </h3>
            </div>
            <div className="p-4">
              {gradeRisks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade Level
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Critical Risk %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {gradeRisks.map((grade, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {grade.grade}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                grade.riskPercentage >= 30
                                  ? "bg-red-100 text-red-800"
                                  : grade.riskPercentage >= 15
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {grade.riskPercentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No grade-level risk data available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatusNotifications: React.FC = () => (
    <>
      {state.errors.generalError && (
        <div className="w-full">
          <div
            className="bg-yellow-50 border-l-4 border-yellow-500 p-3"
            role="alert"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="animate-spin h-5 w-5 text-yellow-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {state.errors.generalError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.ui.isGlobalView && state.analysisData && (
        <div className="w-full">
          <div
            className="bg-blue-50 border-l-4 border-blue-500 p-3"
            role="status"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <Globe className="h-5 w-5 text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Viewing Global Analysis - Showing data for all districts,
                  schools, and grades
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(state.loading.isLoading || state.loading.isInitialLoad) &&
        !state.errors.generalError && (
          <div className="w-full">
            <AIProcessingAnimation
              isProcessing={true}
              message="Analyzing attendance data and generating insights..."
              type="loading"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              <LoadingSkeletonCards />
            </div>
          </div>
        )}
    </>
  );

  console.log("Current state:", {
    loading: state.loading,
    hasAnalysisData: !!state.analysisData,
    hasErrors: state.errors.generalError || state.errors.downloadError,
    authReady,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      {state.loading.isDownloadingReport && <ReportDownloadingModal />}

      <div className="container mx-auto px-4 py-4 max-w-full">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  AI-Driven Attendance Insights & Recommendations
                </h1>
                <div className="group relative">
                  <svg
                    className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-label="More information"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Generated by advanced AI models to highlight risks, trends, and
                next steps for improving attendance outcomes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFilters}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                aria-label={
                  state.ui.showFilters ? "Hide filters" : "Show filters"
                }
              >
                {state.ui.showFilters ? "Hide Filters" : "Show Filters"}
                {state.ui.showFilters ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>
          </div>
          <div className="w-full h-0.5 bg-gray-200 mt-2"></div>
        </div>

        <div className="flex w-full min-h-screen flex-col lg:flex-row gap-4">
          {/* Filter Section */}
          {state.ui.showFilters && <FilterSection />}

          {/* Main Dashboard */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex flex-col gap-4">
              {/* Status Notifications */}
              <StatusNotifications />

              {/* Dashboard Content */}
              {!state.loading.isLoading &&
                !state.loading.isInitialLoad &&
                state.analysisData && (
                  <>
                    <SummaryCards />
                    <InsightsAndRecommendations />
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsDashboard;
