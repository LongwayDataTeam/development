import React from 'react';
import type { FilterState } from '../types/dashboard';

interface DashboardPageProps {
  filters?: FilterState;
}

export function NewDashboardPage({ filters }: DashboardPageProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {/* Dashboard content here */}
    </div>
  );
}
