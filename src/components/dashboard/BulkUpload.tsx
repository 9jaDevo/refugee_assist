import React, { useState } from 'react';
import { Upload, AlertTriangle, Check, X, Download } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { Service } from '../../types';

interface BulkUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

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

export default function BulkUpload({ onClose, onSuccess }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    // Parse and preview the CSV
    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      },
    });
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      
      // Parse the entire CSV
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            const services = results.data.map((row: any) => ({
              name: row.name,
              type: row.type.toLowerCase(),
              address: row.address,
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              phone: row.phone,
              email: row.email,
              website: row.website || null,
              hours: row.hours,
              languages: row.languages.split(',').map((lang: string) => lang.trim()),
              description: row.description,
              created_by: user.id,
            }));
            
            const { error: uploadError } = await supabase
              .from('services')
              .insert(services);
            
            if (uploadError) throw uploadError;
            
            onSuccess();
          } catch (error: any) {
            setError(`Upload failed: ${error.message}`);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
        },
      });
    } catch (error: any) {
      setError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleData = () => {
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_services.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Bulk Upload Services</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="mb-4">
          <button
            onClick={downloadSampleData}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Download Sample CSV</span>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-gray-600">
                Click to select a CSV file or drag and drop
              </span>
              <span className="text-sm text-gray-500">
                Maximum file size: 10MB
              </span>
            </label>
          </div>
        </div>
        
        {file && preview.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Preview (first 5 rows):</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value: any, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 animate-bounce" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}