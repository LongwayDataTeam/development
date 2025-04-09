import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import type { LogisticsData } from '../types/dashboard';
import { Tabs, Tab, ButtonGroup, Button } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function EnhancedInsightCharts({ data }: { data: LogisticsData[] }) {
  const [timeRange, setTimeRange] = useState<'week'|'month'>('week');
  const [activeTab, setActiveTab] = useState(0);

  // 1. Week/Month Sales Trend
  const salesTrendData = React.useMemo(() => {
    // Group data by week/month and calculate percentage changes
    // Implementation depends on your date format
    return [];
  }, [data, timeRange]);

  // 2. State vs Ship Cost Comparison
  const stateShipCostData = React.useMemo(() => {
    return data.reduce((acc, curr) => {
      if (!acc[curr.state]) {
        acc[curr.state] = { state: curr.state, shipCost: 0, count: 0 };
      }
      acc[curr.state].shipCost += curr.shippingCost;
      acc[curr.state].count++;
      return acc;
    }, {} as Record<string, { state: string; shipCost: number; count: number }>);
  }, [data]);

  // 3. Shipping Partner Comparison
  const shippingPartnerData = React.useMemo(() => {
    return data.reduce((acc, curr) => {
      if (!acc[curr.shippingPartner]) {
        acc[curr.shippingPartner] = {
          partner: curr.shippingPartner,
          sales: 0,
          shipCost: 0,
          rtoCost: 0,
          delivered: 0
        };
      }
      acc[curr.shippingPartner].sales += curr.totalSales;
      acc[curr.shippingPartner].shipCost += curr.shippingCost;
      acc[curr.shippingPartner].rtoCost += curr.rtoCost;
      if (curr.status === 'delivered') acc[curr.shippingPartner].delivered++;
      return acc;
    }, {} as Record<string, any>);
  }, [data]);

  // 4. Payment Distribution
  const paymentData = React.useMemo(() => {
    return data.reduce((acc, curr) => {
      if (!acc[curr.paymentMethod]) acc[curr.paymentMethod] = 0;
      acc[curr.paymentMethod]++;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  return (
    <div className="space-y-8">
      {/* 1. Sales Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Sales Trend</h3>
          <ButtonGroup>
            <Button onClick={() => setTimeRange('week')} variant={timeRange === 'week' ? 'contained' : 'outlined'}>
              Week on Week
            </Button>
            <Button onClick={() => setTimeRange('month')} variant={timeRange === 'month' ? 'contained' : 'outlined'}>
              Month on Month
            </Button>
          </ButtonGroup>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis label={{ value: '% Change', angle: -90 }} />
              <Tooltip formatter={(value) => [`${value}%`, 'Change']} />
              <Line type="monotone" dataKey="change" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. State vs Ship Cost */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">State vs Shipping Cost</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.values(stateShipCostData)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value}`, 'Average Cost']} />
              <Bar dataKey="shipCost" fill="#0088FE" name="Avg Shipping Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Shipping Partner Comparison */}
      <div className="bg-white p-6 rounded-lg shadow">
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Sales & Costs" />
          <Tab label="Performance" />
        </Tabs>
        {activeTab === 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.values(shippingPartnerData)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#0088FE" name="Sales" />
                <Bar dataKey="shipCost" fill="#00C49F" name="Shipping Cost" />
                <Bar dataKey="rtoCost" fill="#FF8042" name="RTO Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.values(shippingPartnerData)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delivered" fill="#00C49F" name="Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Payment Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Payment Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={Object.entries(paymentData).map(([name, value]) => ({ name, value }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {Object.keys(paymentData).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
