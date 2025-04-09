import React from 'react';
import { DashboardStats } from '../components/DashboardStats';
import { InsightCharts } from '../components/InsightCharts';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { calculateDashboardStats, filterData } from '../utils/dataTransformers';
import type { FilterState } from '../types/dashboard';

interface DashboardPageProps {
  filters?: FilterState;
}

export function DashboardPage({ filters }: DashboardPageProps) {
  const { data } = useGoogleSheets();
  
  const { filteredData, stats } = React.useMemo(() => {
    const filtered = filters ? filterData(data || [], filters) : data || [];
    console.log('Filtering data:', {
      originalCount: data?.length || 0,
      filteredCount: filtered.length,
      filters
    });
    return {
      filteredData: filtered,
      stats: calculateDashboardStats(filtered)
    };
  }, [data, filters]);

  return (
    <div className="p-4">
      <DashboardStats stats={stats} />
      <InsightCharts data={filteredData} />
    </div>
  );
}
