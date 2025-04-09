import React from 'react';
import { SalesChart } from '../components/SalesChart';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { filterData } from '../utils/dataTransformers';
import type { FilterState } from '../types/dashboard';

interface SalesPageProps {
  filters?: FilterState;
}

export function SalesPage({ filters }: SalesPageProps) {
  const { data } = useGoogleSheets();
  
  const filteredData = React.useMemo(() => {
    return filters ? filterData(data || [], filters) : data || [];
  }, [data, filters]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sales</h1>
      <SalesChart data={filteredData} />
    </div>
  );
}
