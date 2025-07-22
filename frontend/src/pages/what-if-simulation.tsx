import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Target, Sparkles, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
import type { AnalysisData, SimulationState, ProjectedOutcome } from "../types/dashboard-types";
import { AI_STRATEGIES } from "../utils/dashboard-utils";
import { AIProcessingAnimation, CustomPieLabel } from "./ui-components";

// What-If Simulation Component with AI Enhancements and Fixed Charts
export const WhatIfSimulation: React.FC<{ analysisData: AnalysisData | null }> = ({
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
              ),
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
            `tier${tier}Students` as keyof typeof analysisData.summaryStatistics
          ] || 0;

        // Apply AI strategy impact if selected
        const selectedStrategy = selectedStrategies[`tier${tier}`];
        let strategyImpact = 0;
        if (selectedStrategy) {
          const strategy = AI_STRATEGIES[
            `tier${tier}` as keyof typeof AI_STRATEGIES
          ].find((s) => s.name === selectedStrategy);
          if (strategy) {
            strategyImpact = Math.floor((strategy.successRate - 0.5) * 6);
          }
        }

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
          projectedStudents: Math.max(0, currentStudents - improvedStudents),
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
    aiSuggestions,
    selectedStrategies,
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
          ((prev[
            `tier${tier}Improvement` as keyof SimulationState
          ] as number) || 0)
      ),
    }));
  };

  const getAiRecommendation = (tier: number) => {
    const suggestions =
      aiSuggestions[`tier${tier}` as keyof typeof aiSuggestions];
    if (!suggestions || suggestions.length === 0) return null;

    return suggestions[0];
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
  ].filter((item) => item.value > 0);

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
                        {totalImprovedStudents === 0
                          ? "0"
                          : totalImprovedStudents > 0
                          ? `+${totalImprovedStudents.toLocaleString()} students`
                          : `-${Math.abs(
                              totalImprovedStudents
                            ).toLocaleString()} students`}
                      </div>
                      <div className="text-sm text-gray-500">
                        (
                        {overallImprovementPercentage === 0
                          ? "0"
                          : overallImprovementPercentage > 0
                          ? `+${overallImprovementPercentage.toFixed(1)}`
                          : `-${Math.abs(overallImprovementPercentage).toFixed(
                              1
                            )}`}
                        % change)
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
