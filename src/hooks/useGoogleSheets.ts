import { useState, useEffect } from 'react';
import { fetchSheetData } from '../services/googleSheets';
import type { LogisticsData } from '../types/dashboard';

export function useGoogleSheets() {
  const [data, setData] = useState<LogisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const sheetData = await fetchSheetData();
        setData(sheetData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const sheetData = await fetchSheetData();
      setData(sheetData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refreshData };
}