import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Prediction from "./pages/Prediction";
import AlertsDashboard from "./pages/AlertsDashboard";
import AttendanceDash from "./pages/AttendanceDash";
import Home from "./pages/Home";
 
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/ai_attendance_dashboard" element={<AttendanceDash />}/>
            <Route path="/ai_attendance_dashboard/predictions" element={<Prediction />} />
            <Route path="/ai_attendance_dashboard/alerts" element={<AlertsDashboard />} />
            <Route path="/alerts" element={<AlertsDashboard />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </AuthProvider>

  </QueryClientProvider>
);

export default App;
