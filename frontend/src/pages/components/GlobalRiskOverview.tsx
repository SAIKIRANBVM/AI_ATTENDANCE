import type React from "react"
import { Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalysisData } from "@/types/dashboard.types"

interface GlobalRiskOverviewProps {
  analysisData: AnalysisData
}

export const GlobalRiskOverview: React.FC<GlobalRiskOverviewProps> = ({ analysisData }) => {
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
