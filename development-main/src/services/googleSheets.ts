import * as Papa from 'papaparse';
import type { LogisticsData } from '../types/dashboard';

const SHEET_ID = '1wqa4u7Ht2RyqrVinJnrzxC22jObX7pCUcP399-IJ9Js';
const GID = '602434283';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

export async function fetchSheetData(): Promise<LogisticsData[]> {
  try {
    console.log('Fetching sheet data from:', SHEET_URL);
    const response = await fetch(SHEET_URL);
    
    if (!response.ok) {
      console.error('Failed to fetch sheet data:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('Received CSV data length:', csvText.length);
    
    if (!csvText || csvText.trim().length === 0) {
      console.error('Received empty CSV data');
      throw new Error('Received empty data from the server');
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            console.error('No data found in CSV');
            reject(new Error('No data found in the spreadsheet'));
            return;
          }
          
          console.log('Parsed CSV data rows:', results.data.length);
          
          try {
            const transformedData: LogisticsData[] = results.data
              .filter((row: any) => row['Order Date']) // Filter out empty rows
              .map((row: any) => ({
                id: row['Order ID'] || String(Math.random()),
                product: row['SKU'] || '',
                status: transformStatus(row['Deliver Status']),
                destination: `${row['City']}, ${row['State']}`,
                eta: transformDate(row['Order Date']),
                quantity: row['Total Quantity'] || 0,
                shippingPartner: row['Shipping Partner'] || '',
                shippingCost: row['Ship Cost'] || 0,
                paymentMethod: row['Payment Method'] || '',
                state: row['State'] || '',
                city: row['City'] || '',
                pincode: row['Pincode']?.toString() || '',
                rtoCost: row['RTO Cost'] || 0,
                totalSales: row['Total Sales'] || 0
              }));

            console.log('Transformed data rows:', transformedData.length);
            resolve(transformedData);
          } catch (transformError) {
            console.error('Error transforming data:', transformError);
            reject(new Error('Failed to transform spreadsheet data'));
          }
        },
        error: (error: Papa.ParseError) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  } catch (error) {
    console.error('Failed to fetch sheet data:', error);
    throw error;
  }
}

function transformStatus(status: string): LogisticsData['status'] {
  if (!status) return 'pending';
  
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes('rto')) {
    if (normalizedStatus.includes('delivered')) return 'rto_delivered';
    if (normalizedStatus.includes('initiated')) return 'rto_initiated';
    return 'rto';
  }
  
  if (normalizedStatus.includes('deliver')) return 'delivered';
  if (normalizedStatus.includes('ship')) return 'shipped';
  if (normalizedStatus.includes('cancel')) return 'canceled';
  
  return 'pending';
}

function transformDate(dateStr: string): string {
  try {
    // Assuming date format is DD/MM/YYYY
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}