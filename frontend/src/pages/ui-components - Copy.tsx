import React, { useState, useEffect, useRef } from "react";
import { Globe, AlertCircle, Download, ChevronUp, ChevronDown, AlertTriangle, CheckCircle, Info, FileText, Brain, BarChart3, Target, Sparkles, Activity, Loader2, Play, Pause, Bell, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import type {
  AnalysisData,
  GradeRiskItem,
  DistrictSchoolRisk,
  AlertNotification,
  SimulationState,
  ProjectedOutcome,
} from "../types/dashboard-types";
import { AI_STRATEGIES, formatTextWithHighlights } from "../utils/dashboard-utils";

// Enhanced AI Processing Animation Component
export const AIProcessingAnimation: React.FC<{
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

// Custom label component for pie chart
export const CustomPieLabel = ({
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
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

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

// Notification Toggle Component
export const NotificationToggle: React.FC<{
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  notifications: AlertNotification[];
  onClearHistory: () => void;
}> = ({ enabled, onToggle, notifications, onClearHistory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isCritical).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {enabled ? "On" : "Off"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(!enabled)}
                className={`text-xs ${
                  enabled ? "text-green-600" : "text-gray-400"
                }`}
              >
                {enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications
              .slice(-5)
              .reverse()
              .map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex-col items-start p-3"
                >
                  <div className="flex items-start w-full">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 mr-2 ${
                        notification.type === "error"
                          ? "bg-red-500"
                          : notification.type === "warning"
                          ? "bg-yellow-500"
                          : notification.type === "success"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {notification.description}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-sm text-gray-500">No notifications</span>
            </DropdownMenuItem>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearHistory} className="text-center">
              <span className="text-sm text-gray-500">Clear History</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Global Risk Overview Card Component
export const GlobalRiskOverviewCard: React.FC<{ analysisData: AnalysisData }> = ({
  analysisData,
}) => {
  const totalStudents = analysisData.summaryStatistics.totalStudents;
  const atRiskStudents =
    analysisData.summaryStatistics.tier4Students +
    analysisData.summaryStatistics.tier3Students;
  const riskPercentage =
    totalStudents > 0 ? (atRiskStudents / totalStudents) * 100 : 0;

  const getRiskLevel = (percentage: number) => {
    if (percentage >= 30)
      return {
        level: "Critical",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    if (percentage >= 20)
      return {
        level: "High",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      };
    if (percentage >= 10)
      return {
        level: "Medium",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    return {
      level: "Low",
      color: "bg-green-100 text-green-800 border-green-200",
    };
  };

  const riskInfo = getRiskLevel(riskPercentage);

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
            <div className="text-2xl font-bold text-gray-800">
              {totalStudents.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {atRiskStudents.toLocaleString()}
            </div>
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
  );
};

export const LoadingSkeletonCards: React.FC = () => (
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
export const ReportDownloadingModal: React.FC = () => (
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
