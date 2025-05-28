import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';

interface ServiceFiltersProps {
  onFilterChange: (filters: { types: string[], languages: string[] }) => void;
  availableLanguages: string[];
}

const serviceTypes = [
  { value: 'clinic', label: 'Medical Clinics' },
  { value: 'shelter', label: 'Shelters' },
  { value: 'legal', label: 'Legal Aid' },
  { value: 'food', label: 'Food Banks' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other Services' },
];

export default function ServiceFilters({ onFilterChange, availableLanguages }: ServiceFiltersProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleTypeChange = (type: string) => {
    let newTypes: string[];
    
    if (selectedTypes.includes(type)) {
      newTypes = selectedTypes.filter(t => t !== type);
    } else {
      newTypes = [...selectedTypes, type];
    }
    
    setSelectedTypes(newTypes);
    onFilterChange({ types: newTypes, languages: selectedLanguages });
  };
  
  const handleLanguageChange = (language: string) => {
    let newLanguages: string[];
    
    if (selectedLanguages.includes(language)) {
      newLanguages = selectedLanguages.filter(l => l !== language);
    } else {
      newLanguages = [...selectedLanguages, language];
    }
    
    setSelectedLanguages(newLanguages);
    onFilterChange({ types: selectedTypes, languages: newLanguages });
  };
  
  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedLanguages([]);
    onFilterChange({ types: [], languages: [] });
  };
  
  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </span>
          {(selectedTypes.length > 0 || selectedLanguages.length > 0) && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
              {selectedTypes.length + selectedLanguages.length}
            </span>
          )}
        </button>
        
        {(selectedTypes.length > 0 || selectedLanguages.length > 0) && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-600 hover:text-red-600 transition flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
      
      {isExpanded && (
        <div className="mt-4 border rounded-lg p-4 bg-gray-50 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2 text-gray-700">Service Types</h3>
              <div className="grid grid-cols-2 gap-2">
                {serviceTypes.map((type) => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => handleTypeChange(type.value)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 text-gray-700">Languages</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                {availableLanguages.map((language) => (
                  <label key={language} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(language)}
                      onChange={() => handleLanguageChange(language)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm capitalize">{language}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}