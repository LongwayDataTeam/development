import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { LogisticsData } from '../types/dashboard';

interface Props {
  data: LogisticsData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function InsightCharts({ data }: Props) {
  // Prepare data for State-wise Sales + RTO comparison
  const stateComparison = React.useMemo(() => {
    const stateData = data.reduce((acc, curr) => {
      if (!acc[curr.state]) {
        acc[curr.state] = { state: curr.state, sales: 0, rto: 0 };
      }
      acc[curr.state].sales += curr.totalSales;
      acc[curr.state].rto += curr.rtoCost;
      return acc;
    }, {} as Record<string, { state: string; sales: number; rto: number }>);
    
    return Object.values(stateData)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  }, [data]);

  // Prepare data for Shipping Partner comparison
  const shippingPartnerData = React.useMemo(() => {
    const partnerData = data.reduce((acc, curr) => {
      if (!acc[curr.shippingPartner]) {
        acc[curr.shippingPartner] = {
          partner: curr.shippingPartner,
          delivered: 0,
          rto: 0,
          pending: 0,
        };
      }
      if (curr.status === 'delivered') acc[curr.shippingPartner].delivered++;
      else if (curr.status.includes('rto')) acc[curr.shippingPartner].rto++;
      else acc[curr.shippingPartner].pending++;
      return acc;
    }, {} as Record<string, { partner: string; delivered: number; rto: number; pending: number }>);
    
    return Object.values(partnerData);
  }, [data]);

  // Prepare data for Payment Method distribution
  const paymentMethodData = React.useMemo(() => {
    const methodCounts = data.reduce((acc, curr) => {
      if (!acc[curr.paymentMethod]) {
        acc[curr.paymentMethod] = 0;
      }
      acc[curr.paymentMethod]++;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(methodCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* State-wise Sales + RTO Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">State-wise Sales vs RTO</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill="#0088FE" />
              <Bar dataKey="rto" name="RTO Cost" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Compare sales performance and RTO costs across different states
        </p>
      </div>

      {/* Shipping Partner Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Shipping Partner Performance</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shippingPartnerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="partner" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="delivered" name="Delivered" fill="#00C49F" />
              <Bar dataKey="rto" name="RTO" fill="#FF8042" />
              <Bar dataKey="pending" name="Pending" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Analysis of order fulfillment performance by shipping partner
        </p>
      </div>

      {/* Payment Method Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Method Distribution</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentMethodData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Distribution of orders across different payment methods
        </p>
      </div>
    </div>
  );
}