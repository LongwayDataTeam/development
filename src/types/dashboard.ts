export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  products: number;
}

export interface LogisticsData {
  id: string;
  product: string;
  status: 'pending' | 'shipped' | 'delivered' | 'canceled' | 'rto' | 'rto_delivered' | 'rto_initiated';
  destination: string;
  eta: string;
  quantity: number;
  shippingPartner: string;
  shippingCost: number;
  paymentMethod: string;
  state: string;
  city: string;
  pincode: string;
  rtoCost: number;
  totalSales: number;
}

export interface DashboardStats {
  totalSales: number;
  avgShippingCost: number;
  rtoRate: number;
  successRate: number;
  momGrowth: number;
  totalRTOCost: number;
  totalShippingCost: number;
  totalOrders: number;
}

export interface FilterState {
  dateRange: [Date | null, Date | null];
  state: string;
  city: string;
  deliveryStatus: string[];
  shippingPartner: string[];
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface StateMetrics {
  state: string;
  totalSales: number;
  rtoCost: number;
  shippingCost: number;
  orderCount: number;
}

export interface ShippingMetrics {
  partner: string;
  deliveredCount: number;
  rtoCount: number;
  pendingCount: number;
  totalCost: number;
  successRate: number;
  rtoRate: number;
}

export interface SalesTrendData {
  date: string;
  sales: number;
  growth: number;
}

export interface StateComparisonData {
  state: string;
  shippingCost: number;
  percentage: number;
}

export interface ShippingPartnerData {
  partner: string;
  sales: number;
  shippingCost: number;
  rtoCost: number;
  successRate: number;
}

export interface PaymentDistributionData {
  method: string;
  percentage: number;
  amount: number;
}
