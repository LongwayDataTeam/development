import React from 'react';
import type { FilterState } from '../types/dashboard';

interface GrowthPageProps {
  filters?: FilterState;
}

export function NewGrowthPage({ filters }: GrowthPageProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Growth</h1>
      {/* Growth content here */}
    </div>
  );
}
