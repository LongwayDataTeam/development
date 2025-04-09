import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { 
  SalesTrendData, 
  StateComparisonData, 
  ShippingPartnerData, 
  PaymentDistributionData,
  FilterState,
  LogisticsData
} from '../types/dashboard';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { calculateDashboardStats, filterData, prepareTimeSeriesData } from '../utils/dataTransformers';
import { format, parseISO, differenceInDays } from 'date-fns';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Custom tooltip for sales trend
const SalesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-md">
        <p className="font-bold">{label}</p>
        <p className="text-blue-600">Sales: ₹{payload[0].value.toLocaleString()}</p>
        <p className={`${payload[1].value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Growth: {payload[1].value}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for shipping partner comparison
const ShippingTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-md">
        <p className="font-bold">{label}</p>
        <p className="text-blue-600">Sales: ₹{payload[0]?.value.toLocaleString()}</p>
        <p className="text-green-600">Shipping Cost: ₹{payload[1]?.value.toLocaleString()}</p>
        <p className="text-orange-600">RTO Cost: ₹{payload[2]?.value.toLocaleString()}</p>
        <p className="text-purple-600">Success Rate: {payload[3]?.value}%</p>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  filters?: FilterState;
}

const Dashboard: React.FC<DashboardProps> = ({ filters }) => {
  // All hooks must be declared at the top level
  const { data, loading, error, refreshData } = useGoogleSheets();
  const [timeFrame, setTimeFrame] = useState<'week' | 'month'>('week');
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [activeShippingTab, setActiveShippingTab] = useState<'success' | 'comparison'>('success');
  
  // Apply global filters directly - no need for local filters anymore
  const filteredData = useMemo(() => {
    if (!data) return [];
    const defaultFilters: FilterState = {
      dateRange: [null, null],
      state: '',
      city: '',
      deliveryStatus: [],
      shippingPartner: []
    };
    return filterData(data, filters || defaultFilters);
  }, [data, filters]);

  const stats = useMemo(() => {
    if (!filteredData.length) return {
      totalSales: 0,
      avgShippingCost: 0,
      rtoRate: 0,
      successRate: 0,
      momGrowth: 0,
      totalRTOCost: 0,
      totalShippingCost: 0,
      totalOrders: 0
    };
    return calculateDashboardStats(filteredData);
  }, [filteredData]);

  // Calculate additional KPIs
  const additionalKPIs = useMemo(() => {
    if (!filteredData.length) return {
      bestState: { name: 'N/A', value: 0 },
      canceledOrders: { count: 0, value: 0 },
      bestShippingPartner: { name: 'N/A', value: 0, successRate: 0, rtoRate: 0 },
      bestPartnerRTO: { name: 'N/A', value: 0 }
    };

    // Best total sales by state
    const stateData = new Map<string, number>();
    filteredData.forEach(order => {
      stateData.set(order.state, (stateData.get(order.state) || 0) + order.totalSales);
    });
    
    const bestState = Array.from(stateData.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))[0] || { name: 'N/A', value: 0 };
    
    // Canceled orders - use the correct status type
    const canceledOrders = filteredData.filter(order => order.status === 'canceled');
    const canceledValue = canceledOrders.reduce((total, order) => total + order.totalSales, 0);
    
    // Best shipping partner
    const partnerData = new Map<string, { sales: number, delivered: number, total: number, rtoCount: number }>();
    filteredData.forEach(order => {
      const current = partnerData.get(order.shippingPartner) || { sales: 0, delivered: 0, total: 0, rtoCount: 0 };
      partnerData.set(order.shippingPartner, {
        sales: current.sales + order.totalSales,
        delivered: current.delivered + (order.status === 'delivered' ? 1 : 0),
        total: current.total + 1,
        rtoCount: current.rtoCount + (order.status === 'rto' ? 1 : 0)
      });
    });
    
    const bestPartner = Array.from(partnerData.entries())
      .map(([name, data]) => ({ 
        name, 
        value: data.sales, 
        successRate: data.total ? (data.delivered / data.total) * 100 : 0,
        rtoRate: data.total ? (data.rtoCount / data.total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)[0] || { name: 'N/A', value: 0, successRate: 0, rtoRate: 0 };
    
    // Best RTO rate (lowest is best)
    const bestRtoPartner = Array.from(partnerData.entries())
      .filter(([_, data]) => data.total >= 10) // Only consider partners with at least 10 orders
      .map(([name, data]) => ({ 
        name, 
        value: data.total ? (data.rtoCount / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.value - b.value)[0] || { name: 'N/A', value: 0 };
    
    return {
      bestState,
      canceledOrders: { count: canceledOrders.length, value: canceledValue },
      bestShippingPartner: bestPartner,
      bestPartnerRTO: bestRtoPartner
    };
  }, [filteredData]);

  const timeSeriesData = useMemo(() => {
    if (!filteredData.length) return [];
    return prepareTimeSeriesData(filteredData, timeFrame);
  }, [filteredData, timeFrame]);

  const stateComparisonData = useMemo(() => {
    const stateMap = new Map<string, { shippingCost: number; count: number }>();
    
    filteredData.forEach(order => {
      const current = stateMap.get(order.state) || { shippingCost: 0, count: 0 };
      stateMap.set(order.state, {
        shippingCost: current.shippingCost + order.shippingCost,
        count: current.count + 1
      });
    });

    const totalCost = Array.from(stateMap.values()).reduce((sum, { shippingCost }) => sum + shippingCost, 0);
    
    return Array.from(stateMap.entries()).map(([state, { shippingCost, count }]) => ({
      state,
      shippingCost,
      percentage: totalCost ? (shippingCost / totalCost) * 100 : 0
    })).sort((a, b) => b.shippingCost - a.shippingCost);
  }, [filteredData]);

  const shippingPartnerData = useMemo(() => {
    const partnerMap = new Map<string, {
      sales: number;
      shippingCost: number;
      rtoCost: number;
      delivered: number;
      total: number;
    }>();

    filteredData.forEach(order => {
      const current = partnerMap.get(order.shippingPartner) || {
        sales: 0,
        shippingCost: 0,
        rtoCost: 0,
        delivered: 0,
        total: 0
      };
      
      partnerMap.set(order.shippingPartner, {
        sales: current.sales + order.totalSales,
        shippingCost: current.shippingCost + order.shippingCost,
        rtoCost: current.rtoCost + order.rtoCost,
        delivered: current.delivered + (order.status === 'delivered' ? 1 : 0),
        total: current.total + 1
      });
    });

    return Array.from(partnerMap.entries()).map(([partner, data]) => ({
      partner,
      sales: data.sales,
      shippingCost: data.shippingCost,
      rtoCost: data.rtoCost,
      successRate: data.total ? (data.delivered / data.total) * 100 : 0
    })).sort((a, b) => b.sales - a.sales);
  }, [filteredData]);

  const paymentDistributionData = useMemo(() => {
    const paymentMap = new Map<string, { amount: number; count: number }>();
    
    filteredData.forEach(order => {
      const current = paymentMap.get(order.paymentMethod) || { amount: 0, count: 0 };
      paymentMap.set(order.paymentMethod, {
        amount: current.amount + order.totalSales,
        count: current.count + 1
      });
    });

    const totalAmount = Array.from(paymentMap.values()).reduce((sum, { amount }) => sum + amount, 0);
    
    return Array.from(paymentMap.entries()).map(([method, { amount, count }]) => ({
      method,
      amount,
      percentage: totalAmount ? (amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredData]);

  // Initialize selected partners
  useEffect(() => {
    if (shippingPartnerData.length > 0) {
      setSelectedPartners(shippingPartnerData.slice(0, 2).map(p => p.partner));
    }
  }, [shippingPartnerData]);

  const handlePartnerSelect = (partner: string) => {
    setSelectedPartners(prev => 
      prev.includes(partner) 
        ? prev.filter(p => p !== partner)
        : [...prev, partner]
    );
  };

  // Filter shipping partners based on selection
  const filteredShippingData = shippingPartnerData.filter(p => 
    selectedPartners.includes(p.partner)
  );

  // Add a function to help debug total sales issues
  const debugFixTotalSales = () => {
    console.log("Before fix - stats:", stats);
    // Create a copy of the filtered data with non-zero totalSales
    const fixedData = filteredData.map(item => ({
      ...item,
      totalSales: item.totalSales || 1000 // Set a default value if totalSales is missing or 0
    }));
    
    // Log sample of fixed data
    console.log("Sample fixed data:", fixedData.slice(0, 3));
    
    // Recalculate stats with fixed data
    const fixedStats = {
      ...stats,
      totalSales: fixedData.reduce((sum, order) => sum + order.totalSales, 0)
    };
    
    console.log("After fix - stats:", fixedStats);
    // You would have to update your state with these fixed stats in a real fix
    alert(`Debug: Total Sales should be ${fixedStats.totalSales.toLocaleString()}`);
  };

  // Add a fallback calculation for stats if any values are missing or zero
  const fixedStats = useMemo(() => {
    // If stats is undefined or totalSales is 0, calculate a fallback
    if (!stats || stats.totalSales === 0) {
      const totalSales = filteredData.reduce((sum, order) => {
        // Ensure we're adding a number value
        const saleValue = typeof order.totalSales === 'number' ? order.totalSales : 0;
        return sum + saleValue;
      }, 0);
      
      // If we calculated a non-zero value, use that instead
      if (totalSales > 0) {
        console.log('Fixed totalSales calculated:', totalSales);
        return {
          ...stats,
          totalSales
        };
      }
    }
    return stats;
  }, [stats, filteredData]);

  // Additional log to see final stats being used
  useEffect(() => {
    console.log('Final stats being used for display:', fixedStats);
  }, [fixedStats]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <ErrorDisplay error={error} onRetry={refreshData} />
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-700">No Data Available</h3>
          <p className="mt-2 text-yellow-600">There is no data to display. Please try refreshing.</p>
          <button
            onClick={refreshData}
            className="mt-3 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Revenue KPIs - Blue Theme */}
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-800">₹{(fixedStats?.totalSales || 0).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                  <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                </svg>
              </div>
            </div>
            
            <p className={`text-xs ${(fixedStats?.momGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'} mt-2 flex items-center`}>
              {(fixedStats?.momGrowth || 0) >= 0 ? 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                  <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.53.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
                </svg> :
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                  <path fillRule="evenodd" d="M1.22 5.222a.75.75 0 011.06 0L7 9.942l3.768-3.769a.75.75 0 011.113.058 20.908 20.908 0 013.813 7.254l1.574-2.727a.75.75 0 011.3.75l-2.475 4.286a.75.75 0 01-.995.291l-4.28-2.475a.75.75 0 01.75-1.3l2.322 1.342a19.422 19.422 0 00-3.4-6.424L7 10.926 1.22 5.147a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              }
              {Math.abs(fixedStats?.momGrowth || 0).toFixed(1)}% {(fixedStats?.momGrowth || 0) >= 0 ? 'up' : 'down'} from last month
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-800">{(fixedStats?.totalOrders || 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
                  <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zM6 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V12zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V15zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM6 18a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V18zm2.25 0a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Avg. Order Value: ₹{((fixedStats?.totalSales || 0) / (fixedStats?.totalOrders || 1)).toFixed(0)}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-teal-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-800">{(fixedStats?.successRate || 0).toFixed(1)}%</p>
              </div>
              <div className="bg-teal-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-500">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Delivered: {Math.round((fixedStats?.totalOrders || 0) * ((fixedStats?.successRate || 0) / 100)).toLocaleString()} orders
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">RTO Rate</p>
                <p className="text-2xl font-semibold text-gray-800">{(fixedStats?.rtoRate || 0).toFixed(1)}%</p>
              </div>
              <div className="bg-red-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              RTO Orders: {Math.round((fixedStats?.totalOrders || 0) * ((fixedStats?.rtoRate || 0) / 100)).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Shipping Costs</p>
                <p className="text-2xl font-semibold text-gray-800">₹{(fixedStats?.totalShippingCost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500">
                  <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
                  <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
                  <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Avg: ₹{(fixedStats?.avgShippingCost || 0).toLocaleString()} per order
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">RTO Cost</p>
                <p className="text-2xl font-semibold text-gray-800">₹{(fixedStats?.totalRTOCost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-500">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.902 7.098a3.75 3.75 0 013.903-.884.75.75 0 10.498-1.415A5.25 5.25 0 008.005 9.75H7.5a.75.75 0 000 1.5h.054a5.281 5.281 0 000 1.5H7.5a.75.75 0 000 1.5h.505a5.25 5.25 0 006.494 2.701.75.75 0 00-.498-1.415 3.75 3.75 0 01-4.252-1.286h3.001a.75.75 0 000-1.5H9.075a3.77 3.77 0 010-1.5h3.675a.75.75 0 000-1.5h-3a3.75 3.75 0 01.348-.447z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              % of Sales: {((fixedStats?.totalRTOCost || 0) / (fixedStats?.totalSales || 1) * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Net Sales</p>
                <p className="text-2xl font-semibold text-gray-800">₹{((fixedStats?.totalSales || 0) - (fixedStats?.totalShippingCost || 0) - (fixedStats?.totalRTOCost || 0)).toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-500">
                  <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                  <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75H18.75zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                  <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              After Shipping & RTO Costs
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-emerald-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Profit Margin</p>
                <p className="text-2xl font-semibold text-gray-800">{(((fixedStats?.totalSales || 0) - (fixedStats?.totalShippingCost || 0) - (fixedStats?.totalRTOCost || 0)) / (fixedStats?.totalSales || 1) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-500">
                  <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              After Shipping & RTO
            </p>
          </div>

          {/* New KPI Cards */}
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-teal-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Best Performing State</p>
                <p className="text-2xl font-semibold text-gray-800">{additionalKPIs.bestState.name}</p>
              </div>
              <div className="bg-teal-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-teal-500">
                  <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                  <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Total Sales: ₹{additionalKPIs.bestState.value.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Canceled Orders</p>
                <p className="text-2xl font-semibold text-gray-800">{additionalKPIs.canceledOrders.count}</p>
              </div>
              <div className="bg-red-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Value: ₹{additionalKPIs.canceledOrders.value.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Best Shipping Partner</p>
                <p className="text-2xl font-semibold text-gray-800">{additionalKPIs.bestShippingPartner.name}</p>
              </div>
              <div className="bg-purple-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-500">
                  <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
                  <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
                  <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Success Rate: {additionalKPIs.bestShippingPartner.successRate.toFixed(1)}% | ₹{additionalKPIs.bestShippingPartner.value.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-400">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">RTO Rate of Best Partner</p>
                <p className="text-2xl font-semibold text-gray-800">{additionalKPIs.bestShippingPartner.rtoRate.toFixed(1)}%</p>
              </div>
              <div className="bg-green-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Partner: {additionalKPIs.bestShippingPartner.name}
            </p>
          </div>
          
          {/* Delivery Performance KPI - Restructured */}
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-pink-400 md:col-span-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-lg font-medium text-gray-700">Delivery Performance</p>
              </div>
              <div className="bg-pink-50 p-2 rounded-md self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-pink-500">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Delivered</span>
                  <span className="text-sm font-semibold text-green-600">{(fixedStats?.successRate || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${fixedStats?.successRate || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {Math.round((fixedStats?.totalOrders || 0) * ((fixedStats?.successRate || 0) / 100)).toLocaleString()} orders
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">RTO</span>
                  <span className="text-sm font-semibold text-red-600">{(fixedStats?.rtoRate || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${fixedStats?.rtoRate || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {Math.round((fixedStats?.totalOrders || 0) * ((fixedStats?.rtoRate || 0) / 100)).toLocaleString()} orders
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">In Transit</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {(100 - ((fixedStats?.successRate || 0) + (fixedStats?.rtoRate || 0))).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: `${100 - ((fixedStats?.successRate || 0) + (fixedStats?.rtoRate || 0))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {Math.round((fixedStats?.totalOrders || 0) * ((100 - ((fixedStats?.successRate || 0) + (fixedStats?.rtoRate || 0))) / 100)).toLocaleString()} orders
                </p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Total: {fixedStats?.totalOrders || 0} orders | Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Sales Trend Section */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-gray-700">Sales Trend</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeFrame('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFrame === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                Week on Week
              </button>
              <button
                onClick={() => setTimeFrame('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFrame === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                Month on Month
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                yAxisId="left" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => `₹${value/1000}k`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false}
                tickLine={false}
                domain={[-100, 100]}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => `${value}%`}
                allowDataOverflow={false}
              />
              <Tooltip content={<SalesTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Bar 
                yAxisId="left" 
                dataKey="sales" 
                name="Sales Amount" 
                barSize={timeFrame === 'week' ? 20 : 40} 
                fill="url(#salesFill)" 
                stroke="#4F46E5"
                radius={[4, 4, 0, 0]} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="growth" 
                name="Growth %" 
                stroke="#10B981" 
                strokeWidth={2}
                connectNulls={true}
                dot={{ r: 3, strokeWidth: 1, fill: "#10B981", stroke: "#10B981" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-500 mt-2 text-right">
            Showing sales trend and growth by {timeFrame === 'week' ? 'day' : 'month'}
          </div>
        </div>

        {/* State Comparison Section */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-base font-medium text-gray-700 mb-4">State Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stateComparisonData.slice(0, 6)} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="stateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="state" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(value) => `₹${value/1000}k`}
              />
              <Tooltip 
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Shipping Cost']}
                labelFormatter={(label) => `State: ${label}`}
              />
              <Bar 
                dataKey="shippingCost" 
                name="Shipping Cost" 
                fill="url(#stateGradient)" 
                radius={[4, 4, 0, 0]}
              >
                <LabelList 
                  dataKey="percentage" 
                  position="top" 
                  formatter={(value: any) => `${value.toFixed(1)}%`} 
                  style={{ fontSize: 10, fill: '#6B7280' }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-500 mt-2 text-right">
            Showing top 6 states by shipping cost
          </div>
        </div>

        {/* Shipping Partner Comparison Section */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-gray-700">Shipping Partner Comparison</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveShippingTab('success')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeShippingTab === 'success' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                Success Rate
              </button>
              <button
                onClick={() => setActiveShippingTab('comparison')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeShippingTab === 'comparison' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                Cost Comparison
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mb-4">
            {shippingPartnerData.map(partner => (
              <button
                key={partner.partner}
                onClick={() => handlePartnerSelect(partner.partner)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  selectedPartners.includes(partner.partner) 
                    ? 'bg-indigo-100 text-indigo-800 font-medium' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {partner.partner}
              </button>
            ))}
          </div>
          
          {activeShippingTab === 'success' ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={filteredShippingData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="partner" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar 
                  yAxisId="left" 
                  dataKey="sales" 
                  name="Sales" 
                  barSize={30} 
                  fill="url(#salesGradient)" 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="successRate" 
                  name="Success Rate" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  dot={{ r: 4, strokeWidth: 0, fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredShippingData} barGap={4} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="shippingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="rtoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="partner" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip content={<ShippingTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Bar 
                  dataKey="sales" 
                  name="Sales" 
                  fill="url(#salesGradient)" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="shippingCost" 
                  name="Shipping" 
                  fill="url(#shippingGradient)" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rtoCost" 
                  name="RTO" 
                  fill="url(#rtoGradient)" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Distribution Section */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-base font-medium text-gray-700 mb-4">Payment Method Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {paymentDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `${value.toFixed(1)}%`} 
                    labelFormatter={(index: number) => paymentDistributionData[index]?.method || ''}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value, entry, index) => {
                      const { payload } = entry as any;
                      return <span style={{ fontSize: 11, color: '#6B7280' }}>{payload.method}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left font-medium text-gray-500">Payment Method</th>
                    <th className="py-2 text-right font-medium text-gray-500">Amount</th>
                    <th className="py-2 text-right font-medium text-gray-500">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentDistributionData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2.5 font-medium text-gray-700">{item.method}</td>
                      <td className="py-2.5 text-right text-gray-700">₹{item.amount.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-gray-700">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-800">Total</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">
                      ₹{paymentDistributionData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-800">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 