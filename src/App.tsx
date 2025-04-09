import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { DashboardPageWithInsights as DashboardPage } from './pages/DashboardPageWithInsights';
import { NewSalesPage as SalesPage } from './pages/NewSalesPage';
import { NewLogisticsPage as LogisticsPage } from './pages/NewLogisticsPage';
import { NewGrowthPage as GrowthPage } from './pages/NewGrowthPage';
import { NewReportPage as ReportPage } from './pages/NewReportPage';
import Sidebar from './components/Sidebar';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import type { FilterState } from './types/dashboard';
import Dashboard from './components/Dashboard';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium ${
        isActive 
          ? 'bg-blue-100 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function App() {
  const { data, loading, error, refreshData } = useGoogleSheets();
  const [filters, setFilters] = React.useState<FilterState>({
    dateRange: [null, null],
    state: '',
    city: '',
    deliveryStatus: [],
    shippingPartner: [],
  });

  // Debounced filter state
  const [debouncedFilters, setDebouncedFilters] = React.useState(filters);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters]);

  // Extract unique values for filters
  const filterValues = React.useMemo(() => {
    if (!data) return {
      states: [],
      cities: [],
      deliveryStatuses: [],
      shippingPartners: []
    };

    const states = Array.from(new Set(data.map(item => item.state))).sort();
    const deliveryStatuses = Array.from(new Set(data.map(item => item.status))).sort();
    const shippingPartners = Array.from(new Set(data.map(item => item.shippingPartner))).sort();
    
    return {
      states,
      deliveryStatuses,
      shippingPartners,
      cities: filters.state 
        ? Array.from(new Set(data
            .filter(item => item.state === filters.state)
            .map(item => item.city)
          )).sort()
        : []
    };
  }, [data, filters.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <ErrorDisplay error={error} onRetry={refreshData} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <nav className="bg-white shadow-sm flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <LayoutDashboard className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold">AI Dashboard</span>
            </div>
            <div className="flex space-x-4">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/sales">Sales</NavLink>
              <NavLink to="/logistics">Logistics</NavLink>
              <NavLink to="/growth">Growth</NavLink>
              <NavLink to="/report">Report</NavLink>
            </div>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0 bg-white shadow-md fixed h-[calc(100vh-4rem)]">
          <Sidebar
            filters={filters}
            onFiltersChange={setFilters}
            data={data || []}
            refreshData={refreshData}
          />
        </div>
        <main className="flex-1 ml-64 overflow-y-auto p-4 bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard filters={debouncedFilters} />} />
            <Route path="/sales" element={<SalesPage filters={debouncedFilters} />} />
            <Route path="/logistics" element={<LogisticsPage filters={debouncedFilters} />} />
            <Route path="/growth" element={<GrowthPage filters={debouncedFilters} />} />
            <Route path="/report" element={<ReportPage filters={debouncedFilters} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
