import { useState, useEffect } from "react";
import type {
  ApiError,
  FilterState,
  SearchCriteria,
  InsightItem,
  RecommendationItem,
  PrioritySchool,
  GradeRisk,
  CategorizedInsight,
  CategorizedRecommendation,
  AnalysisData,
  DistrictSchoolRisk,
  AppState,
  AppAction,
} from "../types/dashboard-types";

// AI-powered intervention strategies with historical success rates
export const AI_STRATEGIES = {
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

// Helper functions
export const processDistrictCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined;
  return /^D\d+$/.test(code) ? code.substring(1) : code;
};

export const extractSchoolCode = (schoolValue: string): string => {
  if (!schoolValue) return "";
  return schoolValue.includes("-")
    ? schoolValue.split("-").pop() || schoolValue
    : schoolValue;
};

export const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
  districtCode: filters.district ? processDistrictCode(filters.district) : "",
  gradeCode: filters.grade || "",
  schoolCode: filters.school ? extractSchoolCode(filters.school) : "",
});

export const extractErrorMessage = (error: ApiError): string => {
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

export const formatTextWithHighlights = (text: string): string => {
  let formattedText = text.replace(
    /^([^:]+)(:)/,
    '<strong class="font-semibold text-gray-900">$1</strong>:'
  );

  if (formattedText === text) {
    formattedText = text.replace(
      /^(\w+(?:\s+\w+){0,4}\b)/,
      '<strong class="font-semibold text-gray-900">$1</strong>'
    );
  }

  formattedText = formattedText.replace(
    /(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?%)/g,
    '<strong class="text-teal-700">$1</strong>'
  );

  return formattedText;
};

export const getTextFromItem = (
  item: string | InsightItem | RecommendationItem
): string => {
  if (typeof item === "string") return item;
  if ("text" in item && item.text) return item.text;
  if ("insight" in item && item.insight) return item.insight;
  if ("recommendation" in item && item.recommendation)
    return item.recommendation;
  return "No content available";
};

export const extractPrioritySchools = (
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

export const extractGradeLevelRisks = (
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
          grade: grade,
          count: 0,
          riskPercentage: Number.parseFloat(risk),
        });
      }
    }
  });

  return grades.sort((a, b) => {
    const gradeA =
      typeof a.grade === "string"
        ? Number.parseInt(a.grade.replace("Grade ", ""))
        : a.grade;
    const gradeB =
      typeof b.grade === "string"
        ? Number.parseInt(b.grade.replace("Grade ", ""))
        : b.grade;
    return Number(gradeA) - Number(gradeB);
  });
};

export const createOptionKey = (
  prefix: string,
  value: string,
  index?: number,
  additional?: string
): string => {
  return `${prefix}-${additional || "none"}-${value}${
    index !== undefined ? `-${index}` : ""
  }`;
};

// Function to generate mock district school risks data
export const generateDistrictSchoolRisks = (
  analysisData: AnalysisData | null,
  district: string
): DistrictSchoolRisk[] => {
  if (!analysisData || !district) return [];

  const schoolData = analysisData.alertsNotifications?.bySchool || [];

  return schoolData
    .map((school, index) => {
      const riskPercentage = Math.random() * 40 + 5;
      let riskLevel: "Critical" | "High" | "Medium" | "Low";

      if (riskPercentage >= 30) riskLevel = "Critical";
      else if (riskPercentage >= 20) riskLevel = "High";
      else if (riskPercentage >= 10) riskLevel = "Medium";
      else riskLevel = "Low";

      return {
        schoolName: school.school,
        riskPercentage,
        riskLevel,
        studentCount: school.count + Math.floor(Math.random() * 200) + 100,
        district,
      };
    })
    .sort((a, b) => b.riskPercentage - a.riskPercentage);
};

// Debounce hook for performance optimization
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Helper for risk level based on student count
export const getRiskLevel = (
  count: number
): "Critical" | "High" | "Medium" | "Low" => {
  if (count > 100) return "Critical";
  if (count > 50) return "High";
  if (count > 10) return "Medium";
  return "Low";
};

// Helper functions for categorization
export const categorizeInsights = (
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

export const categorizeRecommendations = (
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

export const generateConfidence = (text: string): number => {
  // Simple confidence scoring based on text characteristics
  let score = 70; // Base score

  if (text.includes("%")) score += 10;
  if (text.includes("students")) score += 5;
  if (text.includes("data") || text.includes("analysis")) score += 8;
  if (text.length > 100) score += 5;
  if (text.includes("recommend") || text.includes("suggest")) score += 7;

  return Math.min(95, Math.max(60, score));
};

export const generatePriority = (text: string): "HIGH" | "MEDIUM" | "LOW" => {
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

// App reducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
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
        errors: {
          generalError: null,
          downloadError: null,
          gradeRiskError: null,
        },
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
    case "SET_DISTRICT_SCHOOL_RISKS":
      return {
        ...state,
        districtSchoolRisks: action.payload,
      };
    case "SET_SELECTED_SCHOOL_FOR_GRADES":
      return {
        ...state,
        selectedSchoolForGrades: action.payload,
      };
    case "SET_FULL_DISTRICT_SCHOOL_LIST":
      return {
        ...state,
        fullDistrictSchoolList: action.payload,
      };
    default:
      return state;
  }
};
