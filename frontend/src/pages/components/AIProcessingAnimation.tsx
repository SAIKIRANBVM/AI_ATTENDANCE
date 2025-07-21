import type React from "react"
import { Download, Loader2, RefreshCw, Brain } from "lucide-react"

interface AIProcessingAnimationProps {
  isProcessing: boolean
  message?: string
  type?: "loading" | "downloading" | "processing" | "filtering"
}

export const AIProcessingAnimation: React.FC<AIProcessingAnimationProps> = ({
  isProcessing,
  message = "Processing",
  type = "processing",
}) => {
  if (!isProcessing) return null

  const getIcon = () => {
    switch (type) {
      case "downloading":
        return <Download className="w-4 h-4 text-blue-600 animate-bounce" />
      case "loading":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case "filtering":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case "downloading":
        return "Generating Report"
      case "loading":
        return "Loading Dashboard"
      case "filtering":
        return "Applying Filters"
      default:
        return "AI Processing"
    }
  }

  return (
    <div className="flex items-center justify-center space-x-3 py-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse"></div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="text-sm font-semibold text-blue-700">{getMessage()}</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">{message}</div>
      </div>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
      </div>
    </div>
  )
}
