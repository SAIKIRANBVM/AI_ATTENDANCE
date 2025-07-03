# Alerts Dashboard

A modular and maintainable dashboard for monitoring and analyzing student attendance data.

## Structure

```
src/
  pages/
    AlertsDashboard/
      ├── index.tsx          # Main dashboard component
      ├── useDashboard.ts    # Custom hook for dashboard logic
      └── README.md          # This file
```

## Key Features

- **Modular Architecture**: Separated concerns with dedicated components and hooks
- **Type Safety**: Full TypeScript support with well-defined types
- **Responsive Design**: Works on all device sizes
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance**: Optimized data fetching and state management

## Components

### Main Components

- `AlertsDashboard`: The main container component that orchestrates the dashboard
- `FilterSection`: Handles all filter controls (district, school, grade)
- `AnalysisSection`: Displays analysis data and insights

### Custom Hooks

- `useDashboard`: Manages all dashboard state, data fetching, and event handlers

## State Management

The dashboard uses React's built-in state management with the following state structure:

```typescript
interface FilterState {
  district: string;
  school: string;
  grade: string;
  districtOptions: DistrictOption[];
  schoolOptions: SchoolOption[];
  gradeOptions: GradeOption[];
  allSchoolOptions: SchoolOption[];
}

interface UiState {
  loading: boolean;
  downloadingReport: boolean;
  error: string | null;
  isGlobalView: boolean;
  showFilters: boolean;
  isInitialLoad: boolean;
  loadTimer: NodeJS.Timeout | null;
}

interface DataState {
  analysisData: AnalysisData | null;
}
```

## API Integration

The dashboard integrates with the following API endpoints:

- `GET /api/districts/`: Fetch list of districts
- `GET /api/schools/`: Fetch list of schools
- `GET /api/grades/`: Fetch list of grades
- `POST /api/prediction-insights/`: Fetch analysis data
- `GET /api/download/report`: Download reports
- `GET /api/download/report/below_85`: Download below 85% attendance report

## Development

### Adding New Features

1. **New Filter**: Add to `FilterSection` and update `useDashboard`
2. **New Chart/Visualization**: Create a new component in `components/dashboard/`
3. **New API Endpoint**: Add to `useDashboard` with proper error handling

### Best Practices

- Keep components small and focused on a single responsibility
- Use TypeScript interfaces for all props and state
- Handle all API errors gracefully
- Ensure responsive design works on all screen sizes
- Write unit tests for complex logic

## Future Improvements

- Add more detailed error boundaries
- Implement data caching with React Query or SWR
- Add more interactive visualizations
- Support for user preferences (saved filters, etc.)
- Add end-to-end tests
