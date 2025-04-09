import React from 'react';
import type { FilterState } from '../types/dashboard';

interface ReportPageProps {
  filters?: FilterState;
}

export function NewReportPage({ filters }: ReportPageProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Report</h1>
      {/* Report content here */}
    </div>
  );
}
