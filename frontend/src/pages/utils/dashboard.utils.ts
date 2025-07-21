"use client"

import React from "react"

import type {
  FilterState,
  SearchCriteria,
  InsightItem,
  RecommendationItem,
  CategorizedInsight,
  CategorizedRecommendation,
} from "@/types/dashboard.types"

export const processDistrictCode = (code: string | undefined): string | undefined => {
  if (!code) return undefined
  return /^D\d+$/.test(code) ? code.substring(1) : code
}

export const extractSchoolCode = (schoolValue: string): string => {
  if (!schoolValue) return ""
  return schoolValue.includes("-") ? schoolValue.split("-").pop() || schoolValue : schoolValue
}

export const createSearchCriteria = (filters: FilterState): SearchCriteria => ({
  districtCode: filters.district ? processDistrictCode(filters.district) : "",
  gradeCode: filters.grade || "",
  schoolCode: filters.school ? extractSchoolCode(filters.school) : "",
})

export const formatTextWithHighlights = (text: string): string => {
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

export const getTextFromItem = (item: string | InsightItem | RecommendationItem): string => {
  if (typeof item === "string") return item
  if ("text" in item && item.text) return item.text
  if ("insight" in item && item.insight) return item.insight
  if ("recommendation" in item && item.recommendation) return item.recommendation
  return "No content available"
}

export const generateConfidence = (text: string): number => {
  let score = 70

  if (text.includes("%")) score += 10
  if (text.includes("students")) score += 5
  if (text.includes("data") || text.includes("analysis")) score += 8
  if (text.length > 100) score += 5
  if (text.includes("recommend") || text.includes("suggest")) score += 7

  return Math.min(95, Math.max(60, score))
}

export const generatePriority = (text: string): "HIGH" | "MEDIUM" | "LOW" => {
  const textLower = text.toLowerCase()

  if (textLower.includes("critical") || textLower.includes("urgent") || textLower.includes("risk")) {
    return "HIGH"
  } else if (textLower.includes("consider") || textLower.includes("improve") || textLower.includes("focus")) {
    return "MEDIUM"
  }
  return "LOW"
}

export const categorizeInsights = (insights: Array<string | InsightItem>): CategorizedInsight[] => {
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

export const categorizeRecommendations = (
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

export const createOptionKey = (prefix: string, value: string, index?: number, additional?: string): string => {
  return `${prefix}-${additional || "none"}-${value}${index !== undefined ? `-${index}` : ""}`
}

export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
