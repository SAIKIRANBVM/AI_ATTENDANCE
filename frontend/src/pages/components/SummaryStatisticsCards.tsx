import type React from "react"
import { Activity, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalysisData } from "@/types/dashboard.types"

interface SummaryStatisticsCardsProps {
  data: AnalysisData
}

export const SummaryStatisticsCards: React.FC<SummaryStatisticsCardsProps> = ({ data }) => {
  const stats = data.summaryStatistics

  const cardData = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: <Activity className="w-5 h-5" />,
      color: "bg-blue-50 border-blue-200 text-blue-800",
      bgColor: "bg-blue-500",
    },
    {
      title: "Tier 1 (≥95%)",
      value: stats.tier1Students,
      icon: <CheckCircle className="w-5 h-5" />,
      color: "bg-green-50 border-green-200 text-green-800",
      bgColor: "bg-green-500",
    },
    {
      title: "Tier 2 (90-95%)",
      value: stats.tier2Students,
      icon: <CheckCircle className="w-5 h-5" />,
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      bgColor: "bg-emerald-500",
    },
    {
      title: "Tier 3 (80-90%)",
      value: stats.tier3Students,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      bgColor: "bg-yellow-500",
    },
    {
      title: "Tier 4 (<80%)",
      value: stats.tier4Students,
      icon: <AlertCircle className="w-5 h-5" />,
      color: "bg-orange-50 border-orange-200 text-orange-800",
      bgColor: "bg-orange-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {cardData.map((card, index) => (
        <Card
          key={index}
          className={`border-l-4 ${card.color} hover:shadow-md transition-all duration-300 transform hover:scale-105`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor} text-white`}>{card.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value?.toLocaleString() || "0"}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents > 0
                ? `${((card.value / stats.totalStudents) * 100).toFixed(1)}% of total`
                : "No data"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
