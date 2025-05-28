import React, { useState, useEffect } from 'react';
import { Service } from '../../types';
import { MapPinIcon, Save, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceFormProps {
  service?: Service;
  onSave: () => void;
  onCancel: () => void;
}

const commonLanguages = [
  'English',
  'Spanish',
  'French',
  'Arabic',
  'Ukrainian',
  'Russian',
  'German',
  'Chinese',
  'Persian',
  'Turkish',
  'Swahili',
  'Hindi',
  'Urdu',
  'Pashto',
  'Somali'
];

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bangladesh', 'Belarus', 'Belgium', 'Benin', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Burkina Faso',
  'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Eritrea', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea', 'Haiti',
  'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia',
  'Lebanon', 'Liberia', 'Libya', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Mali',
  'Malta', 'Mauritania', 'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function ServiceForm({ service, onSave, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    type: 'clinic',
    address: '',
    latitude: 0,
    longitude: 0,
    phone: '',
    email: '',
    website: '',
    hours: '',
    languages: [],
    description: '',
    country: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [showNewLanguageInput, setShowNewLanguageInput] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(commonLanguages);
  
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        type: service.type,
        address: service.address,
        latitude: service.latitude,
        longitude: service.longitude,
        phone: service.phone,
        email: service.email,
        website: service.website || '',
        hours: service.hours,
        languages: [...service.languages],
        description: service.description,
        country: service.country || '',
      });
    }

    // Fetch all unique languages from existing services
    fetchLanguages();
  }, [service]);

  const fetchLanguages = async () => {
    try {
      const { data: services, error } = await supabase
        .from('services')
        .select('languages');

      if (error) throw error;

      const uniqueLanguages = new Set([
        ...commonLanguages,
        ...(services?.flatMap(s => s.languages) || [])
      ]);

      setAvailableLanguages(Array.from(uniqueLanguages).sort());
    } catch (error) {
      console.error('Error fetching languages:', error);
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }
    
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!formData.latitude || !formData.longitude) {
      newErrors.coordinates = 'Coordinates are required';
    }
    
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Phone is required';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.website && !/^https?:\/\/\S+\.\S+/.test(formData.website)) {
      newErrors.website = 'Invalid website URL';
    }
    
    if (!formData.hours?.trim()) {
      newErrors.hours = 'Hours of operation are required';
    }
    
    if (!formData.languages?.length) {
      newErrors.languages = 'At least one language is required';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleGeocode = async () => {
    if (!formData.address) {
      setErrors({ ...errors, address: 'Address is required for geocoding' });
      return;
    }
    
    try {
      // In a real application, you would use a geocoding service here
      // For demonstration purposes, we'll use a mock response
      // In production, you might use Google Maps Geocoding API, Mapbox, etc.
      
      // Mock geocoding response - in real app replace with actual API call
      setTimeout(() => {
        // Sample coordinates (these should come from API in real app)
        const lat = 51.505 + (Math.random() * 0.01);
        const lng = -0.09 + (Math.random() * 0.01);
        
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lng,
        });
        
        setErrors({
          ...errors,
          coordinates: undefined,
        });
      }, 500);
      
    } catch (error) {
      setErrors({
        ...errors,
        coordinates: 'Failed to geocode address. Please check and try again.',
      });
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguages = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({
      ...formData,
      languages: selectedLanguages
    });
    setErrors({
      ...errors,
      languages: undefined
    });
  };

  const addNewLanguage = () => {
    if (!newLanguage.trim()) return;

    const formattedLanguage = newLanguage.trim();
    if (!availableLanguages.includes(formattedLanguage)) {
      setAvailableLanguages([...availableLanguages, formattedLanguage].sort());
    }
    
    setFormData({
      ...formData,
      languages: [...(formData.languages || []), formattedLanguage]
    });
    
    setNewLanguage('');
    setShowNewLanguageInput(false);
    setErrors({
      ...errors,
      languages: undefined
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('You must be logged in to save a service');
      }
      
      if (service?.id) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', service.id);
        
        if (error) throw error;
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert({
            ...formData,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (error) throw error;
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Failed to save service. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {service ? 'Edit Service' : 'Add New Service'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Service name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.country ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
          </div>
          
          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={formData.type || 'clinic'}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="clinic">Medical Clinic</option>
              <option value="shelter">Shelter</option>
              <option value="legal">Legal Aid</option>
              <option value="food">Food Bank</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                className={`flex-1 px-3 py-2 border rounded-md ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Full address"
              />
              <button
                type="button"
                onClick={handleGeocode}
                className="bg-gray-100 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Get coordinates from address"
              >
                <MapPinIcon className="h-5 w-5" />
              </button>
            </div>
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                id="latitude"
                name="latitude"
                value={formData.latitude || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.coordinates ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Latitude"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                id="longitude"
                name="longitude"
                value={formData.longitude || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.coordinates ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Longitude"
              />
            </div>
            {errors.coordinates && (
              <p className="text-red-500 text-xs mt-1 col-span-2">{errors.coordinates}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Phone number"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>
        
        <div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Contact email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          
          <div className="mb-4">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.website ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="https://example.com"
            />
            {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
          </div>
          
          <div className="mb-4">
            <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-1">
              Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="hours"
              name="hours"
              value={formData.hours || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.hours ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Mon-Fri: 9am-5pm, Sat: 10am-2pm"
            />
            {errors.hours && <p className="text-red-500 text-xs mt-1">{errors.hours}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Languages <span className="text-red-500">*</span>
            </label>
            <select
              multiple
              value={formData.languages || []}
              onChange={handleLanguageChange}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.languages ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              size={5}
            >
              {availableLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            
            {!showNewLanguageInput ? (
              <button
                type="button"
                onClick={() => setShowNewLanguageInput(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add new language</span>
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new language"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewLanguage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addNewLanguage}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLanguageInput(false);
                    setNewLanguage('');
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {errors.languages && (
              <p className="text-red-500 text-xs mt-1">{errors.languages}</p>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple languages
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Detailed description of the service..."
        />
        {errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description}</p>
        )}
      </div>
      
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4" />
          <span>{isSubmitting ? 'Saving...' : 'Save Service'}</span>
        </button>
      </div>
    </form>
  );
}