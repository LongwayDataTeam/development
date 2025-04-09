import React from 'react';
import { format } from 'date-fns';
import type { FilterState } from '../types/dashboard';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  states: string[];
  cities: string[];
  deliveryStatuses: string[];
  shippingPartners: string[];
}

export function DashboardSidebar({
  filters,
  onFilterChange,
  states,
  cities,
  deliveryStatuses,
  shippingPartners,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-64 h-full">
      <h2 className="text-xl font-semibold mb-6">Filters</h2>
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-xs text-gray-500">From</span>
              <input
                type="date"
                value={filters.dateRange[0] ? format(filters.dateRange[0], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null;
                  onFilterChange({
                    ...filters,
                    dateRange: [newDate, filters.dateRange[1]],
                  });
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mt-1"
              />
            </div>
            <div>
              <span className="text-xs text-gray-500">To</span>
              <input
                type="date"
                value={filters.dateRange[1] ? format(filters.dateRange[1], 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null;
                  onFilterChange({
                    ...filters,
                    dateRange: [filters.dateRange[0], newDate],
                  });
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mt-1"
              />
            </div>
          </div>
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <select
            value={filters.state}
            onChange={(e) => {
              onFilterChange({
                ...filters,
                state: e.target.value,
                city: null, // Reset city when state changes
              });
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <select
            value={filters.city || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                city: e.target.value || null,
              })
            }
            disabled={!filters.state}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Status
          </label>
          <select
            value={filters.deliveryStatus || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                deliveryStatus: e.target.value ? [e.target.value] : [],
              })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {deliveryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Shipping Partner Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shipping Partner
          </label>
          <select
            value={filters.shippingPartner || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                shippingPartner: e.target.value ? [e.target.value] : [],
              })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Partners</option>
            {shippingPartners.map((partner) => (
              <option key={partner} value={partner}>
                {partner}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters Button */}
        <div className="pt-4">
          <button
            onClick={() => {
              onFilterChange({
                dateRange: [null, null],
                state: '',
                city: null,
                deliveryStatus: [],
                shippingPartner: [],
              });
            }}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}