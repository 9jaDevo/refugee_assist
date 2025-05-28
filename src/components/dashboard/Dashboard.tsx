import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, RotateCw, BarChart2, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Service } from '../../types';
import { ColumnDef } from '@tanstack/react-table';
import ServiceForm from './ServiceForm';
import Analytics from './Analytics';
import BulkUpload from './BulkUpload';
import DataTable from './DataTable';
import { Navigate } from 'react-router-dom';
import Papa from 'papaparse';

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchServices();
      } else {
        setLoading(false);
      }
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        if (event === 'SIGNED_IN') {
          fetchServices();
        } else if (event === 'SIGNED_OUT') {
          setServices([]);
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingService(null);
    setIsAdding(true);
    setShowAnalytics(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsAdding(true);
    setShowAnalytics(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    setSelectedService(id);
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      alert('Failed to delete service. Please try again.');
    } finally {
      setIsDeleting(false);
      setSelectedService(null);
    }
  };

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: 'name',
      header: 'Service',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.hours}</div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}
        </span>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">{row.original.address}</div>
      ),
    },
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.phone}</div>
          <div className="text-gray-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'languages',
      header: 'Languages',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.languages.slice(0, 3).map((lang) => (
            <span key={lang} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
              {lang}
            </span>
          ))}
          {row.original.languages.length > 3 && (
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
              +{row.original.languages.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="text-blue-600 hover:text-blue-900"
            title="Edit service"
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className={`text-red-600 hover:text-red-900 ${
              isDeleting && selectedService === row.original.id ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isDeleting && selectedService === row.original.id}
            title="Delete service"
          >
            {isDeleting && selectedService === row.original.id ? (
              <RotateCw className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  const handleSave = () => {
    setIsAdding(false);
    fetchServices();
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingService(null);
  };

  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
    setIsAdding(false);
  };

  const downloadTemplate = () => {
    const sampleData = [
      {
        name: "Example Medical Clinic",
        type: "clinic",
        address: "123 Main St, City, Country",
        latitude: "51.5074",
        longitude: "-0.1278",
        phone: "+1-555-0123",
        email: "clinic@example.com",
        website: "https://example.com",
        hours: "Mon-Fri: 9am-5pm",
        languages: "English, Spanish, Arabic",
        description: "General medical services with multilingual staff"
      },
      {
        name: "Community Shelter",
        type: "shelter",
        address: "456 Oak Ave, City, Country",
        latitude: "51.5080",
        longitude: "-0.1290",
        phone: "+1-555-0124",
        email: "shelter@example.com",
        website: "",
        hours: "24/7",
        languages: "English, French",
        description: "Emergency shelter providing temporary housing and basic necessities"
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'services_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user && !loading) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Volunteer Dashboard</h2>
          <div className="flex gap-3">
            <button
              onClick={toggleAnalytics}
              className={`flex items-center gap-2 px-4 py-2 ${
                showAnalytics 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } border rounded-md transition-colors`}
            >
              <BarChart2 className="h-5 w-5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-md transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Download Template</span>
            </button>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-md transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span>Bulk Upload</span>
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {showAnalytics ? (
          <Analytics />
        ) : isAdding ? (
          <div className="bg-white rounded-lg shadow-md">
            <ServiceForm
              service={editingService || undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <RotateCw className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            ) : services.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-gray-500 mb-4">
                  No services added yet.
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-md transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    <span>Download Template</span>
                  </button>
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-600 hover:bg-gray-50 border rounded-md transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    <span>Bulk Upload</span>
                  </button>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Service</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                <DataTable
                  data={services}
                  columns={columns}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            fetchServices();
          }}
        />
      )}
    </div>
  );
}