import { format, parseISO, differenceInDays } from 'date-fns';
import type {
  LogisticsData,
  DashboardStats,
  StateMetrics,
  ShippingMetrics,
  ChartData,
  FilterState
} from '../types/dashboard';

export function filterData(data: LogisticsData[], filters: FilterState): LogisticsData[] {
  console.log('Applying filters:', filters);
  return data.filter(item => {
    // Date range filter
    if (filters.dateRange[0] && filters.dateRange[1]) {
      const itemDate = new Date(item.eta);
      if (itemDate < filters.dateRange[0] || itemDate > filters.dateRange[1]) {
        return false;
      }
    }

    // State filter
    if (filters.state && item.state !== filters.state) {
      return false;
    }

    // City filter
    if (filters.city && item.city !== filters.city) {
      return false;
    }

    // Delivery status filter
    if (filters.deliveryStatus.length > 0 && !filters.deliveryStatus.includes(item.status)) {
      return false;
    }

    // Shipping partner filter
    if (filters.shippingPartner.length > 0 && !filters.shippingPartner.includes(item.shippingPartner)) {
      return false;
    }

    return true;
  });
}
import { TrendingUpIcon, TrendingDownIcon } from '@heroicons/react/solid'; // Replace with the correct library or path


export function calculateDashboardStats(data: LogisticsData[]): DashboardStats {
  console.log('calculateDashboardStats called with data length:', data.length);
  
  const validOrders = data.filter(order => order.status !== 'canceled');
  console.log('Valid orders (not canceled):', validOrders.length);
  
  const totalOrders = validOrders.length;
  
  // Check if totalSales values exist in the data
  const sampleOrders = validOrders.slice(0, 5);
  console.log('Sample orders totalSales values:', sampleOrders.map(o => o.totalSales));
  
  const totalSales = validOrders.reduce((sum, order) => sum + (order.totalSales || 0), 0);
  console.log('Calculated totalSales:', totalSales);
  
  const rtoOrders = data.filter(order => 
    ['rto', 'rto delivered', 'rto initiated', 'rto undelivered'].some(status => 
      order.status.toLowerCase().includes(status)
    )
  ).length;
  
  // Additional debugging
  const hasNaNValues = validOrders.some(order => isNaN(order.totalSales));
  console.log('Has NaN totalSales values:', hasNaNValues);
  
  const totalShippingCost = data.reduce((sum, order) => sum + (order.shippingCost || 0), 0);
  const totalRTOCost = data.reduce((sum, order) => sum + (order.rtoCost || 0), 0);
  const avgShippingCost = totalShippingCost / (totalOrders || 1);
  
  console.log('Debug values:', {
    totalOrders,
    totalSales,
    totalShippingCost,
    totalRTOCost,
    avgShippingCost
  });

  const uniqueCustomers = new Set(data.map(order => order.pincode)).size;
  const dateRange = data.map(order => new Date(order.eta));
  const minDate = new Date(Math.min(...dateRange.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dateRange.map(d => d.getTime())));
  const daysInRange = differenceInDays(maxDate, minDate) || 1;

  // Calculate state metrics
  const stateMetrics = calculateStateMetrics(data);
  const topState = stateMetrics.reduce((max, state) => 
    state.totalSales > max.totalSales ? state : max, stateMetrics[0]);

  // Calculate city metrics
  const cityMap = new Map<string, number>();
  data.forEach(order => {
    const count = cityMap.get(order.city) || 0;
    cityMap.set(order.city, count + 1);
  });
  const topCity = Array.from(cityMap.entries()).reduce((max, [city, count]) => 
    count > max[1] ? [city, count] : max, ['', 0]);

  // Calculate shipping partner metrics
  const shippingMetrics = calculateShippingMetrics(data);
  const bestPartner = shippingMetrics.length > 0 
    ? shippingMetrics.reduce((max, partner) => 
        partner.deliveredCount > max.deliveredCount ? partner : max, shippingMetrics[0])
    : { 
        partner: 'N/A', 
        deliveredCount: 0,
        rtoCount: 0,
        pendingCount: 0,
        totalCost: 0,
        successRate: 0,
        rtoRate: 0
      };

  // Calculate day of week metrics
  const dayMap = new Map<string, number>();
  data.forEach(order => {
    const day = format(parseISO(order.eta), 'EEEE');
    const count = dayMap.get(day) || 0;
    dayMap.set(day, count + 1);
  });
  const peakDay = Array.from(dayMap.entries()).reduce((max, [day, count]) => 
    count > max[1] ? [day, count] : max, ['', 0]);

  // Calculate product metrics
  const productMap = new Map<string, number>();
  data.forEach(order => {
    const count = productMap.get(order.product) || 0;
    productMap.set(order.product, count + 1);
  });
  const popularProduct = Array.from(productMap.entries()).reduce((max, [product, count]) => 
    count > max[1] ? [product, count] : max, ['', 0]);

  // Calculate MoM growth with improved logic based on max date in data
  const currentMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const previousMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth() - 1, 1);
  const currentMonthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const previousMonthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth(), 0);

  console.log('Month over Month - Date Range:', {
    maxDate: format(maxDate, 'yyyy-MM-dd'),
    currentMonth: format(currentMonthStart, 'MMM yyyy'),
    previousMonth: format(previousMonthStart, 'MMM yyyy')
  });

  // Calculate sales for each month
  const currentMonthSales = data
    .filter(order => {
      const orderDate = parseISO(order.eta);
      return orderDate >= currentMonthStart && orderDate <= currentMonthEnd;
    })
    .reduce((sum, order) => sum + order.totalSales, 0);

  const previousMonthSales = data
    .filter(order => {
      const orderDate = parseISO(order.eta);
      return orderDate >= previousMonthStart && orderDate <= previousMonthEnd;
    })
    .reduce((sum, order) => sum + order.totalSales, 0);

  console.log('Month over Month - Sales Comparison:', {
    currentMonthSales,
    previousMonthSales
  });

  // Calculate MoM growth with simpler but more reliable formula
  const momGrowth = previousMonthSales > 0
    ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
    : currentMonthSales > 0 ? 100 : 0; // Handle case of no previous data

  // Apply bounds to prevent extreme values
  const boundedMomGrowth = Math.max(-100, Math.min(500, momGrowth));
  console.log('Month over Month - Growth:', boundedMomGrowth.toFixed(1) + '%');

  // Calculate YoY growth
  const currentYear = format(maxDate, 'yyyy');
  const previousYear = format(new Date(maxDate.getFullYear() - 1, maxDate.getMonth(), 1), 'yyyy');

  const currentYearSales = data
    .filter(order => format(parseISO(order.eta), 'yyyy') === currentYear)
    .reduce((sum, order) => sum + order.totalSales, 0);

  const prevYearSales = data
    .filter(order => format(parseISO(order.eta), 'yyyy') === previousYear)
    .reduce((sum, order) => sum + order.totalSales, 0);

  const yoyGrowth = prevYearSales ? ((currentYearSales - prevYearSales) / prevYearSales) * 100 : 0;

    // const getGrowthInfo = (growth: number) => {
    //   if (growth > 0) {
    //     return {
    //       value: `+${growth.toFixed(2)}%`,
    //       icon: { type: TrendingUpIcon, props: { className: "w-6 h-6" } },
    //       color: 'text-green-600',
    //       info: 'Growth compared to the previous period',
    //     };
    //   } else if (growth < 0) {
    //     return {
    //       value: `${growth.toFixed(2)}%`,
    //       icon: { type: TrendingUpIcon, props: { className: "w-6 h-6" } },
    //       color: 'text-red-600',
    //       info: 'Decline compared to the previous period',
    //     };
    //   } else {
    //     return {
    //       value: '0%',
    //       icon: { type: TrendingUpIcon, props: { className: "w-6 h-6" } },
    //       color: 'text-gray-600',
    //       info: 'No change compared to the previous period',
    //     };
    //   }
    // };

  // const momStatCardProps = getGrowthInfo(momGrowth);
  // const yoyStatCardProps = getGrowthInfo(yoyGrowth);


  // Calculate average delivery time (simplified)
  const deliveredOrders = data.filter(order => order.status === 'delivered');
  const avgDeliveryTime = deliveredOrders.length > 0 
    ? deliveredOrders.reduce((sum, order) => {
        const orderDate = parseISO(order.eta);
        const deliveryDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000); // Simulate delivery date
        return sum + differenceInDays(deliveryDate, orderDate);
      }, 0) / deliveredOrders.length
    : 0;

    return {
      totalSales: totalSales,
      totalOrders,
      avgShippingCost: avgShippingCost,
      successRate: (data.filter(order => order.status === 'delivered').length / (totalOrders || 1)) * 100,
      rtoRate: (rtoOrders / (totalOrders || 1)) * 100,
      momGrowth: boundedMomGrowth,
      totalRTOCost: totalRTOCost,
      totalShippingCost: totalShippingCost
    };
}

export function calculateStateMetrics(data: LogisticsData[]): StateMetrics[] {
  const stateMap = new Map<string, StateMetrics>();

  data.forEach(order => {
    const current = stateMap.get(order.state) || {
      state: order.state,
      totalSales: 0,
      rtoCost: 0,
      shippingCost: 0,
      orderCount: 0
    };

    stateMap.set(order.state, {
      ...current,
      totalSales: current.totalSales + order.totalSales,
      rtoCost: current.rtoCost + order.rtoCost,
      shippingCost: current.shippingCost + order.shippingCost,
      orderCount: current.orderCount + 1
    });
  });

  return Array.from(stateMap.values());
}

export function calculateShippingMetrics(data: LogisticsData[]): ShippingMetrics[] {
  const partnerMap = new Map<string, ShippingMetrics>();

  data.forEach(order => {
    const current = partnerMap.get(order.shippingPartner) || {
      partner: order.shippingPartner,
      deliveredCount: 0,
      rtoCount: 0,
      pendingCount: 0,
      totalCost: 0,
      successRate: 0,
      rtoRate: 0
    };

    // Update counts based on order status
    if (order.status === 'delivered') {
      current.deliveredCount += 1;
    } else if (order.status.includes('rto')) {
      current.rtoCount += 1;
    } else if (order.status === 'pending') {
      current.pendingCount += 1;
    }

    current.totalCost += order.shippingCost;

    // Calculate success and RTO rates
    const totalProcessed = current.deliveredCount + current.rtoCount;
    current.successRate = totalProcessed > 0 
      ? (current.deliveredCount / totalProcessed) * 100 
      : 0;
    current.rtoRate = totalProcessed > 0
      ? (current.rtoCount / totalProcessed) * 100
      : 0;

    partnerMap.set(order.shippingPartner, current);
  });

  return Array.from(partnerMap.values());
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    shipped: 'bg-blue-100 text-blue-800',
    canceled: 'bg-red-100 text-red-800',
    rto: 'bg-orange-100 text-orange-800',
    rto_delivered: 'bg-orange-100 text-orange-800',
    rto_initiated: 'bg-orange-100 text-orange-800'
  };

  const normalizedStatus = status.toLowerCase();
  return statusColors[normalizedStatus] || 'bg-gray-100 text-gray-800';
}

export function prepareTimeSeriesData(data: LogisticsData[], timeFrame: 'week' | 'month' = 'week') {
  if (timeFrame === 'week') {
    // Daily data for week view
    const dailyData = new Map<string, { sales: number; orders: number; date: string }>();

    data.forEach(order => {
      const date = format(parseISO(order.eta), 'yyyy-MM-dd');
      const current = dailyData.get(date) || { sales: 0, orders: 0, date };

      dailyData.set(date, {
        sales: current.sales + order.totalSales,
        orders: current.orders + 1,
        date
      });
    });

    // Convert to array and sort chronologically
    let sortedData = Array.from(dailyData.entries())
      .map(([date, metrics]) => ({
        date: format(parseISO(date), 'MMM dd'),
        rawDate: date,
        sales: metrics.sales,
        orders: metrics.orders
      }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    // Calculate growth percentages
    return sortedData.map((current, index) => {
      if (index === 0) {
        return {
          ...current,
          growth: 0
        };
      }

      const previous = sortedData[index - 1];
      // Calculate growth percentage, but constrain extreme values for better visualization
      let growthPercentage = previous.sales > 0 
        ? ((current.sales - previous.sales) / previous.sales) * 100 
        : current.sales > 0 ? 100 : 0;
      
      // Constrain extreme values to keep the chart visually meaningful
      growthPercentage = Math.max(-100, Math.min(100, growthPercentage));
      
      return {
        ...current,
        growth: parseFloat(growthPercentage.toFixed(1))
      };
    });
  } else {
    // Monthly data for month view
    const monthlyData = new Map<string, { sales: number; orders: number; monthKey: string }>();

    data.forEach(order => {
      const monthKey = format(parseISO(order.eta), 'yyyy-MM');
      const current = monthlyData.get(monthKey) || { sales: 0, orders: 0, monthKey };

      monthlyData.set(monthKey, {
        sales: current.sales + order.totalSales,
        orders: current.orders + 1,
        monthKey
      });
    });

    // Convert to array and sort chronologically
    let sortedData = Array.from(monthlyData.entries())
      .map(([monthKey, metrics]) => ({
        date: format(parseISO(`${monthKey}-01`), 'MMM yyyy'),
        rawDate: monthKey,
        sales: metrics.sales,
        orders: metrics.orders
      }))
      .sort((a, b) => {
        // Parse the date strings to ensure proper chronological sorting
        const dateA = new Date(a.rawDate);
        const dateB = new Date(b.rawDate);
        return dateA.getTime() - dateB.getTime();
      });

    // Calculate month-over-month growth percentages
    return sortedData.map((current, index) => {
      if (index === 0) {
        return {
          ...current,
          growth: 0
        };
      }

      const previous = sortedData[index - 1];
      // Calculate growth percentage, but constrain extreme values for better visualization 
      let growthPercentage = previous.sales > 0 
        ? ((current.sales - previous.sales) / previous.sales) * 100 
        : current.sales > 0 ? 100 : 0;
      
      // Constrain extreme values to keep the chart visually meaningful
      growthPercentage = Math.max(-100, Math.min(100, growthPercentage));
      
      return {
        ...current,
        growth: parseFloat(growthPercentage.toFixed(1))
      };
    });
  }
}