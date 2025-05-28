import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';
import { Download, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [dateRange, setDateRange] = useState('month');
  const [serviceType, setServiceType] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState({
    services: [],
    totalServices: 0,
    servicesByType: {},
    servicesByLanguage: {},
    servicesOverTime: {},
    servicesByCountry: {},
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, serviceType, selectedCountry]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get date range
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (dateRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Build query
      let query = supabase
        .from('services')
        .select('*', { count: 'exact' })
        .gte('created_at', startDate.toISOString());

      if (serviceType !== 'all') {
        query = query.eq('type', serviceType);
      }

      if (selectedCountry !== 'all') {
        query = query.eq('country', selectedCountry);
      }

      const { data: services, error: servicesError, count } = await query;

      if (servicesError) throw servicesError;

      // Process data for charts
      const servicesByType = {};
      const servicesByLanguage = {};
      const servicesOverTime = {};
      const servicesByCountry = {};

      (services || []).forEach(service => {
        // Count by type
        servicesByType[service.type] = (servicesByType[service.type] || 0) + 1;

        // Count by language
        service.languages.forEach(lang => {
          servicesByLanguage[lang] = (servicesByLanguage[lang] || 0) + 1;
        });

        // Count by country
        if (service.country) {
          servicesByCountry[service.country] = (servicesByCountry[service.country] || 0) + 1;
        }

        // Group by date
        const date = new Date(service.created_at).toLocaleDateString();
        servicesOverTime[date] = (servicesOverTime[date] || 0) + 1;
      });

      setData({
        services: services || [],
        totalServices: count || 0,
        servicesByType,
        servicesByLanguage,
        servicesOverTime,
        servicesByCountry,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const csv = Papa.unparse(data.services);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `services_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Services Analytics Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);

    // Add summary
    doc.text(`Total Services: ${data.totalServices}`, 20, 45);
    
    // Add tables
    const tableData = Object.entries(data.servicesByType).map(([type, count]) => [
      type.charAt(0).toUpperCase() + type.slice(1),
      count,
    ]);

    (doc as any).autoTable({
      startY: 60,
      head: [['Service Type', 'Count']],
      body: tableData,
    });

    // Save the PDF
    doc.save(`services_report_${new Date().toISOString()}.pdf`);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const servicesOverTimeData: ChartData<'line'> = {
    labels: Object.keys(data.servicesOverTime),
    datasets: [
      {
        label: 'Services Added',
        data: Object.values(data.servicesOverTime),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const servicesByTypeData: ChartData<'bar'> = {
    labels: Object.keys(data.servicesByType).map(
      type => type.charAt(0).toUpperCase() + type.slice(1)
    ),
    datasets: [
      {
        label: 'Services by Type',
        data: Object.values(data.servicesByType),
        backgroundColor: [
          'rgba(37, 99, 235, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(234, 179, 8, 0.6)',
          'rgba(249, 115, 22, 0.6)',
        ],
      },
    ],
  };

  const servicesByLanguageData: ChartData<'doughnut'> = {
    labels: Object.keys(data.servicesByLanguage),
    datasets: [
      {
        data: Object.values(data.servicesByLanguage),
        backgroundColor: [
          'rgba(37, 99, 235, 0.6)',
          'rgba(139, 92, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(234, 179, 8, 0.6)',
          'rgba(249, 115, 22, 0.6)',
        ],
      },
    ],
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Analytics Dashboard</h2>
        
        <div className="flex items-center gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border rounded-md py-1 px-2 text-sm"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border rounded-md py-1 px-2 text-sm"
            >
              <option value="all">All Countries</option>
              {Object.keys(data.servicesByCountry).sort().map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Service Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="border rounded-md py-1 px-2 text-sm"
            >
              <option value="all">All Services</option>
              <option value="clinic">Medical Clinics</option>
              <option value="shelter">Shelters</option>
              <option value="legal">Legal Aid</option>
              <option value="food">Food Banks</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Export Buttons */}
          <button
            onClick={exportToCsv}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={exportToPdf}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Cards */}
          <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900">Total Services</h3>
              <p className="text-3xl font-bold text-blue-600">{data.totalServices}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-purple-900">Service Types</h3>
              <p className="text-3xl font-bold text-purple-600">
                {Object.keys(data.servicesByType).length}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-900">Languages</h3>
              <p className="text-3xl font-bold text-green-600">
                {Object.keys(data.servicesByLanguage).length}
              </p>
            </div>
          </div>

          {/* Services Over Time Chart */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Services Over Time</h3>
            <div className="h-80">
              <Line data={servicesOverTimeData} options={chartOptions} />
            </div>
          </div>

          {/* Services by Type Chart */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Services by Type</h3>
            <div className="h-80">
              <Bar data={servicesByTypeData} options={chartOptions} />
            </div>
          </div>

          {/* Services by Language Chart */}
          <div className="bg-gray-50 p-4 rounded-lg col-span-2">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Language Distribution</h3>
            <div className="h-80">
              <Doughnut data={servicesByLanguageData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}