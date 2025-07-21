import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import type { AnalysisData } from "@/types/dashboard.types"

interface ChartsSectionProps {
  data: AnalysisData
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ data }) => {
  const stats = data.summaryStatistics

  // Prepare data for bar chart
  const barChartData = [
    { name: "Tier 1", value: stats.tier1Students, color: "#10b981" },
    { name: "Tier 2", value: stats.tier2Students, color: "#059669" },
    { name: "Tier 3", value: stats.tier3Students, color: "#d97706" },
    { name: "Tier 4", value: stats.tier4Students, color: "#ea580c" },
  ]

  // Prepare data for pie chart
  const pieChartData = [
    { name: "Low Risk (Tier 1-2)", value: stats.tier1Students + stats.tier2Students, color: "#10b981" },
    { name: "Medium Risk (Tier 3)", value: stats.tier3Students, color: "#d97706" },
    { name: "High Risk (Tier 4)", value: stats.tier4Students, color: "#ea580c" },
  ].filter((item) => item.value > 0)

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
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
        {`${name}: ${value.toLocaleString()}`}
      </text>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Bar Chart */}
      <Card className="border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📊 Attendance Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), "Students"]}
                labelFormatter={(label) => `${label} Students`}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="border-l-4 border-green-400 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📈 Risk Level Distribution</CardTitle>
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
            {pieChartData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500 text-sm">No data to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
