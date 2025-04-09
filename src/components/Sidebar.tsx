import React, { useState } from 'react';
import { FilterState } from '../types/dashboard';

interface SidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  data: any[];
  refreshData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ filters, onFiltersChange, data, refreshData }) => {
  const [startDate, setStartDate] = useState<string>(
    filters.dateRange[0] ? new Date(filters.dateRange[0]).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState<string>(
    filters.dateRange[1] ? new Date(filters.dateRange[1]).toISOString().split('T')[0] : ''
  );

  // Handle state selection
  const handleStateChange = (state: string) => {
    onFiltersChange({
      ...filters,
      state: state !== 'all' ? state : '',
      // Reset city when state changes
      city: ''
    });
  };

  // Handle city selection
  const handleCityChange = (city: string) => {
    onFiltersChange({
      ...filters,
      city: city !== 'all' ? city : ''
    });
  };

  // Handle delivery status selection
  const handleDeliveryStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      deliveryStatus: status !== 'all' ? [status] : []
    });
  };

  // Handle shipping partner selection
  const handleShippingPartnerChange = (partner: string) => {
    onFiltersChange({
      ...filters,
      shippingPartner: partner !== 'all' ? [partner] : []
    });
  };

  // Handle date range change
  const handleDateRangeChange = () => {
    onFiltersChange({
      ...filters,
      dateRange: [
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      ]
    });
  };

  // Apply button for date range
  const handleApplyDateRange = () => {
    handleDateRangeChange();
  };

  // Clear filters
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    onFiltersChange({
      dateRange: [null, null],
      state: '',
      city: '',
      deliveryStatus: [],
      shippingPartner: []
    });
  };

  return (
    <div className="w-64 bg-white p-4 border-r border-gray-200 h-screen sticky top-0 overflow-auto">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Filters</h2>
          <button
            onClick={refreshData}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh Data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Date Range Section */}
        <div className="space-y-2 border-b border-gray-100 pb-4">
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              onClick={handleApplyDateRange}
              className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
            >
              Apply Date Range
            </button>
          </div>
        </div>

        {/* State Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">State</label>
          <select 
            value={filters.state || 'all'} 
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="all">All States</option>
            {Array.from(new Set(data?.map(item => item.state) || [])).sort().map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">City</label>
          <select 
            value={filters.city || 'all'} 
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            disabled={!filters.state}
          >
            <option value="all">All Cities</option>
            {Array.from(new Set(
              data?.filter(item => !filters.state || item.state === filters.state)
                .map(item => item.city) || []
            )).sort().map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Delivery Status Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Delivery Status</label>
          <select 
            value={filters.deliveryStatus?.length ? filters.deliveryStatus[0] : 'all'} 
            onChange={(e) => handleDeliveryStatusChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {Array.from(new Set(data?.map(item => item.status) || [])).sort().map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Shipping Partner Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Shipping Partner</label>
          <select 
            value={filters.shippingPartner?.length ? filters.shippingPartner[0] : 'all'} 
            onChange={(e) => handleShippingPartnerChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="all">All Partners</option>
            {Array.from(new Set(data?.map(item => item.shippingPartner) || [])).sort().map(partner => (
              <option key={partner} value={partner}>{partner}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClearFilters}
          className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors mt-4"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 