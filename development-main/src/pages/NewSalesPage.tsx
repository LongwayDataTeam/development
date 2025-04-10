import React from 'react';
import { SalesChart } from '../components/SalesChart';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { filterData } from '../utils/dataTransformers';
import type { FilterState, LogisticsData, SalesData } from '../types/dashboard';

interface NewSalesPageProps {
  filters?: FilterState;
}

function transformToSalesData(logisticsData: LogisticsData[]): SalesData[] {
  const salesByDate: Record<string, SalesData> = {};

  logisticsData.forEach(item => {
    const date = item.eta.split('T')[0];
    if (!salesByDate[date]) {
      salesByDate[date] = {
        date,
        revenue: 0,
        orders: 0,
        products: 0
      };
    }
    salesByDate[date].revenue += item.totalSales;
    salesByDate[date].orders += 1;
    salesByDate[date].products += item.quantity;
  });

  return Object.values(salesByDate);
}

export function NewSalesPage({ filters }: NewSalesPageProps) {
  const { data } = useGoogleSheets();
  
  const filteredData = React.useMemo(() => {
    return filters ? filterData(data || [], filters) : data || [];
  }, [data, filters]);

  const salesData = React.useMemo(() => {
    return transformToSalesData(filteredData);
  }, [filteredData]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sales</h1>
      <SalesChart data={salesData} />
    </div>
  );
}
