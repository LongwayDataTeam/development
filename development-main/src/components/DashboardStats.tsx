import React from 'react';
import { 
  DollarSign, TruckIcon, Users, BarChart2, 
  RefreshCcw, AlertTriangle, Calculator, 
  TrendingUp, TrendingDown, Percent, Box, 
  CreditCard, MapPin, Calendar, Tag, 
  Shield, Award,
  ShoppingCart, Truck, Home, Archive
} from 'lucide-react';
import type { DashboardStats as DashboardStatsType } from '../types/dashboard';

interface Props {
  stats: DashboardStatsType;
  dateRange?: { from: string; to: string };
  status?: string;
}

export function DashboardStats({ stats, dateRange, status }: Props) {
  const momStatCardProps = {
    value: `${stats.momGrowth.toFixed(1)}%`,
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-green-600",
    info: "Month-over-Month growth percentage",
  };

  const yoyStatCardProps = {
    value: `${stats.yoyGrowth.toFixed(1)}%`,
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-blue-600",
    info: "Year-over-Year growth percentage",
  };
  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {/* Row 1 */}
      <StatCard
        title="Total Revenue"
        value={`₹${stats.totalRevenue.toLocaleString()}`}
        icon={<DollarSign className="w-6 h-6" />}
        color="text-green-600"
        info="Total revenue from all successful orders"
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toString()}
        icon={<ShoppingCart className="w-6 h-6" />}
        color="text-blue-600"
        info="Total number of orders placed"
      />
      {/* <StatCard
        title="Active Shipments"
        value={stats.activeShipments.toString()}
        icon={<Truck className="w-6 h-6" />}
        color="text-indigo-600"
        info="Currently shipped orders in transit"
      /> */}
      <StatCard
        title="Delivery Success Rate"
        value={`${stats.deliverySuccess.toFixed(1)}%`}
        icon={<Award className="w-6 h-6" />}
        color="text-teal-600"
        info="Percentage of successfully delivered orders"
      />
      {/* <StatCard
        title="Avg Delivery Time"
        value="3.2 days"
        icon={<Clock className="w-6 h-6" />}
        color="text-purple-600"
        info="Average time from order to delivery"
      /> */}

      {/* Row 2 */}
      <StatCard
        title="Total RTO Cost"
        value={`₹${stats.totalRTOCost.toLocaleString()}`}
        icon={<TruckIcon className="w-6 h-6" />}
        color="text-red-600"
        info="Total cost incurred from returned orders"
      />
      <StatCard
        title="RTO Percentage"
        value={`${stats.rtoPercentage.toFixed(1)}%`}
        icon={<AlertTriangle className="w-6 h-6" />}
        color="text-orange-600"
        info="Percentage of orders that were returned"
      />
      <StatCard
        title="Total Shipping Cost"
        value={`₹${stats.totalShippingCost.toLocaleString()}`}
        icon={<TruckIcon className="w-6 h-6" />}
        color="text-purple-600"
        info="Total cost spent on shipping"
      />
      <StatCard
        title="Shipping Cost %"
        value={`${((stats.totalShippingCost / stats.totalRevenue) * 100).toFixed(1)}%`}
        icon={<Percent className="w-6 h-6" />}
        color="text-pink-600"
        info="Shipping cost as percentage of revenue"
      />
      <StatCard
        title="Avg Shipping Cost"
        value={`₹${(stats.totalShippingCost / stats.totalOrders).toLocaleString()}`}
        icon={<Box className="w-6 h-6" />}
        color="text-amber-600"
        info="Average shipping cost per order"
      />

      {/* Row 3 */}
      <StatCard
        title="Unique Customers"
        value={stats.uniqueCustomers.toString()}
        icon={<Users className="w-6 h-6" />}
        color="text-indigo-600"
        info="Number of unique customers based on pincode"
      />
      <StatCard
        title="Avg Order Value"
        value={`₹${stats.avgOrderValue.toLocaleString()}`}
        icon={<Calculator className="w-6 h-6" />}
        color="text-cyan-600"
        info="Average value per order"
      />
      <StatCard
        title="Avg Orders/Day"
        value={stats.avgOrdersPerDay.toFixed(1)}
        icon={<BarChart2 className="w-6 h-6" />}
        color="text-teal-600"
        info="Average number of orders per day"
      />
      <StatCard
        title="Canceled Orders Value"
        value={`₹${stats.canceledOrdersValue.toLocaleString()}`}
        icon={<RefreshCcw className="w-6 h-6" />}
        color="text-rose-600"
        info="Total value of canceled orders"
      />
      <StatCard
        title="Canceled Orders Count"
        value={stats.canceledOrdersCount.toString()}
        icon={<Archive className="w-6 h-6" />}
        color="text-red-600"
        info="Number of canceled orders"
      />

      {/* Row 4 */}
      {/* <StatCard
        title="Top State Revenue"
        value="Maharashtra"
        icon={<MapPin className="w-6 h-6" />}
        color="text-blue-600"
        info="State generating highest revenue"
      /> */}
      {/* <StatCard
        title="Top City Orders"
        value="Mumbai"
        icon={<Home className="w-6 h-6" />}
        color="text-green-600"
        info="City with most orders"
      /> */}
      <StatCard
        title="Best Shipping Partner"
        value={stats.bestShippingPartner || 'N/A'}
        icon={<Shield className="w-6 h-6" />}
        color="text-orange-600"
        info={stats.bestShippingPartner 
          ? `${stats.bestShippingPartner} has most deliveries` 
          : 'No delivery data available'}
      />
      <StatCard
        title="Best Partner RTO Rate"
        value={`${stats.bestShippingPartnerRTORate.toFixed(1)}%`}
        icon={<Shield className="w-6 h-6" />}
        color="text-red-600"
        info={stats.bestShippingPartner 
          ? `RTO rate for ${stats.bestShippingPartner}` 
          : 'No RTO data available'}
      />
      {/* <StatCard
        title="Peak Order Day"
        value="Monday"
        icon={<Calendar className="w-6 h-6" />}
        color="text-purple-600"
        info="Day with most orders"
      />  */}
      {/* <StatCard
        title="Most Popular Product"
        value="Widget X"
        icon={<Tag className="w-6 h-6" />}
        color="text-pink-600"
        info="Best selling product"
      /> */}

    {/* Row 5 */}
      {/* <StatCard
      title="MoM Growth"
      value={momStatCardProps.value}
      icon={momStatCardProps.icon}
      color={momStatCardProps.color}
      info={momStatCardProps.info}
    /> */}
    {/* <StatCard
      title="YoY Growth"
      value={yoyStatCardProps.value}
      icon={yoyStatCardProps.icon}
      color={yoyStatCardProps.color}
      info={yoyStatCardProps.info}
    /> */}
      {/* <StatCard
        title="Customer Satisfaction"
        value="4.7/5"
        icon={<Star className="w-6 h-6" />}
        color="text-yellow-600"
        info="Average customer rating"
      /> */}
      {/* <StatCard
        title="Return Rate"
        value={stats.returnRate.toString()}
        icon={<TrendingDown className="w-6 h-6" />}
        color="text-red-600"
        info="Percentage of products returned"
      /> */}
      {/* <StatCard
        title="Inventory Turnover"
        value="5.1x"
        icon={<Activity className="w-6 h-6" />}
        color="text-blue-600"
        info="How quickly inventory sells"
      /> */}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  info: string;
}

function StatCard({ title, value, icon, color, info }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className={`${color}`}>{icon}</div>
      </div>
      <div className="absolute invisible group-hover:visible bg-gray-800 text-white text-sm rounded p-2 -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full z-10 w-48 text-center">
        {info}
      </div>
    </div>
  );
}