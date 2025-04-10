import React from 'react';
import { DashboardStats } from '../components/DashboardStats';
import { InsightCharts } from '../components/InsightCharts';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { calculateDashboardStats, filterData } from '../utils/dataTransformers';
import type { FilterState } from '../types/dashboard';

interface DashboardPageProps {
  filters?: FilterState;
}

const DashboardPageWithInsights = React.memo(function DashboardPageWithInsights({ 
  filters 
}: DashboardPageProps) {
  const { data } = useGoogleSheets();
  
  const { filteredData, stats } = React.useMemo(() => {
    const filtered = filters ? filterData(data || [], filters) : data || [];
    return {
      filteredData: filtered,
      stats: calculateDashboardStats(filtered)
    };
  }, [data, filters]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Insights</h1>
      <DashboardStats stats={stats} />
      <InsightCharts data={filteredData} />
    </div>
  );
});

export { DashboardPageWithInsights };
