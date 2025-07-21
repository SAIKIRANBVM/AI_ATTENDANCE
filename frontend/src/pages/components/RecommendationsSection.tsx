"use client"

import type React from "react"
import { useState } from "react"
import { Target, ChevronUp, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RecommendationItem } from "@/types/dashboard.types"
import { categorizeRecommendations, formatTextWithHighlights } from "@/utils/dashboard.utils"

interface RecommendationsSectionProps {
  recommendations: Array<string | RecommendationItem>
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({ recommendations }) => {
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(true)
  const categorizedRecommendations = categorizeRecommendations(recommendations)

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg mb-6">
      <CardHeader
        className="bg-[#03787c] text-white cursor-pointer hover:bg-[#026266] transition-all duration-300"
        onClick={() => setRecommendationsExpanded(!recommendationsExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">🎯 AI Recommendations</CardTitle>
              <p className="text-blue-100 text-sm">Actionable Strategies & Next Steps</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              <span className="text-xs font-medium">{recommendations.length} recommendations</span>
            </div>
            {recommendationsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </CardHeader>

      {recommendationsExpanded && (
        <CardContent className="p-6">
          <div className="space-y-6">
            {categorizedRecommendations.map((category, categoryIndex) => (
              <div key={categoryIndex} className={`p-4 rounded-lg border-2 ${category.color}`}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">{category.icon}</span>
                  <h4 className="font-semibold text-sm">{category.priority} Priority</h4>
                  <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                    {category.items.length} item{category.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="bg-white/50 p-3 rounded-md">
                      <div
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: formatTextWithHighlights(item.text),
                        }}
                      />
                      <div className="flex items-center justify-end mt-2">
                        <div className="text-xs text-gray-500">Confidence: {item.confidence}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
