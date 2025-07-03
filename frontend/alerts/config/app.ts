/**
 * Application configuration
 * 
 * This file contains all the application-wide configuration values
 * that might need to be updated when the school year changes.
 */

// Current school year (format: 'YYYY')
export const CURRENT_SCHOOL_YEAR = '2024';

// Next school year (format: 'YYYY')
export const NEXT_SCHOOL_YEAR = '2025';

// Current academic year (format: 'YYYY-YYYY')
export const CURRENT_ACADEMIC_YEAR = `${CURRENT_SCHOOL_YEAR}-${NEXT_SCHOOL_YEAR}`;

// Default time range for data
// Format: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
export const DEFAULT_DATE_RANGE = {
  start: `${CURRENT_SCHOOL_YEAR}-08-01`,
  end: `${NEXT_SCHOOL_YEAR}-07-31`
};

// Chart configuration
export const CHART_CONFIG = {
  currentYearColor: '#3b82f6', // blue-500
  nextYearColor: '#10b981',     // emerald-500
  gridColor: '#e5e7eb',        // gray-200
  textColor: '#374151',         // gray-700
  tooltipBgColor: '#1f2937',    // gray-800
  tooltipTextColor: '#f9fafb'   // gray-50
};

// API configuration
export const API_CONFIG = {
  // Use environment variable if available (set in your build process),
  // otherwise fall back to the default local development URL
  baseURL: (() => {
    // This works with Create React App's environment variables
    if (typeof import.meta.env?.VITE_API_URL === 'string') {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback for other setups
    return 'http://localhost:8000';
  })(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_AI_PREDICTIONS: true,
  ENABLE_ATTENDANCE_TRACKING: true,
  ENABLE_ADVANCED_REPORTING: true
};

// Export all config as default for easier imports
export default {
  CURRENT_SCHOOL_YEAR,
  NEXT_SCHOOL_YEAR,
  CURRENT_ACADEMIC_YEAR,
  DEFAULT_DATE_RANGE,
  CHART_CONFIG,
  API_CONFIG,
  FEATURE_FLAGS
};
