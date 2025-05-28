import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader as LoaderIcon, Phone, Mail, Globe, Clock, Languages, Navigation } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { supabase } from '../../lib/supabase';
import { Service } from '../../types';
import ServiceFilters from './ServiceFilters';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Badge styles for different sources
const badgeStyles = {
  Verified: 'bg-green-100 text-green-800',
  OSM: 'bg-blue-100 text-blue-800',
  GooglePlaces: 'bg-purple-100 text-purple-800'
};

// Custom marker colors for different service types
const markerColors = {
  clinic: '#FF0000', // Red
  shelter: '#4B0082', // Indigo
  legal: '#FFA500', // Orange
  food: '#008000', // Green
  education: '#FFD700', // Gold
  other: '#808080' // Gray
};

export default function ServiceMap() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    types: [] as string[],
    languages: [] as string[],
    radius: 5000, // 5km default radius
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [lastFetchedLocation, setLastFetchedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fetchTimeoutRef = useRef<number | null>(null);

  // Get user's location
  const getUserLocation = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLocating(true);
        
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();

        if (!mapContainerRef.current) return;

        let initialCenter = { lat: 51.505, lng: -0.09 }; // Default center (London)
        
        try {
          const position = await getUserLocation();
          initialCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          const userPos = new google.maps.LatLng(initialCenter.lat, initialCenter.lng);
          setUserLocation(userPos);
        } catch (locationError) {
          console.warn('Failed to get user location:', locationError);
          // Continue with default location
        }

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 13,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        infoWindowRef.current = new google.maps.InfoWindow();

        // Add user location marker if available
        if (userLocation) {
          new google.maps.Marker({
            position: userLocation,
            map: mapRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: 'Your Location'
          });
        }

        // Add map move listener with debounce
        mapRef.current.addListener('idle', () => {
          if (fetchTimeoutRef.current) {
            window.clearTimeout(fetchTimeoutRef.current);
          }
          
          fetchTimeoutRef.current = window.setTimeout(() => {
            const center = mapRef.current?.getCenter();
            if (center) {
              const newLat = center.lat();
              const newLng = center.lng();
              
              // Only fetch if we've moved significantly (more than 100 meters)
              if (!lastFetchedLocation || 
                  calculateDistance(
                    lastFetchedLocation.lat, 
                    lastFetchedLocation.lng, 
                    newLat, 
                    newLng
                  ) > 0.1) {
                fetchNearbyServices(newLat, newLng);
                setLastFetchedLocation({ lat: newLat, lng: newLng });
              }
            }
          }, 1000); // 1 second debounce
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to load Google Maps');
      } finally {
        setIsLocating(false);
      }
    };

    initMap();

    return () => {
      if (fetchTimeoutRef.current) {
        window.clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyServices = useCallback(async (lat: number, lng: number) => {
    if (!lat || !lng || loading) return;

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .rpc('find_services_within_radius', {
          lat,
          lon: lng,
          radius_meters: filters.radius
        });
      
      if (queryError) throw queryError;
      
      setServices(data || []);
      setFilteredServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load nearby services');
    } finally {
      setLoading(false);
    }
  }, [filters.radius, loading]);

  // Only fetch services when map is initialized and user location is available
  useEffect(() => {
    if (userLocation && isInitialized && !loading && !lastFetchedLocation) {
      fetchNearbyServices(userLocation.lat(), userLocation.lng());
      setLastFetchedLocation({
        lat: userLocation.lat(),
        lng: userLocation.lng()
      });
    }
  }, [userLocation, isInitialized, fetchNearbyServices, loading, lastFetchedLocation]);

  // Apply filters
  useEffect(() => {
    let result = [...services];
    
    if (filters.types.length > 0) {
      result = result.filter(service => filters.types.includes(service.type));
    }
    
    if (filters.languages.length > 0) {
      result = result.filter(service => 
        service.languages.some(lang => filters.languages.includes(lang))
      );
    }
    
    setFilteredServices(result);
  }, [services, filters.types, filters.languages]);

  // Update markers when filtered services change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();

    // Create new markers
    const newMarkers = filteredServices.map(service => {
      const marker = new google.maps.Marker({
        position: { lat: service.latitude, lng: service.longitude },
        map: mapRef.current,
        icon: {
          url: 'https://developers.google.com/static/maps/images/maps-icon.svg',
          scaledSize: new google.maps.Size(32, 32),
          fillColor: markerColors[service.type as keyof typeof markerColors],
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: '#FFFFFF',
          scale: 1
        },
        title: service.name
      });

      marker.addListener('click', () => {
        if (!infoWindowRef.current) return;

        const content = `
          <div class="min-w-[300px] p-4">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-semibold text-lg">${service.name}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full ${badgeStyles[service.badge as keyof typeof badgeStyles] || 'bg-gray-100 text-gray-800'}">
                ${service.badge}
              </span>
            </div>
            <div class="text-sm text-blue-600 font-medium capitalize mb-2">
              ${service.type}
            </div>
            <p class="text-gray-600 text-sm mb-2">${service.address}</p>
            <div class="space-y-1 text-sm">
              <p><a href="tel:${service.phone}" class="text-blue-600 hover:underline">${service.phone}</a></p>
              <p><a href="mailto:${service.email}" class="text-blue-600 hover:underline">${service.email}</a></p>
              ${service.website ? `<p><a href="${service.website}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Website</a></p>` : ''}
              <p>${service.hours}</p>
              <p>Languages: ${service.languages.join(', ')}</p>
            </div>
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 inline-flex items-center gap-1 bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 transition text-sm"
            >
              Get Directions
            </a>
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapRef.current, marker);
      });

      return marker;
    });

    markersRef.current = newMarkers;

    // Update or create marker clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(newMarkers);
    } else {
      clustererRef.current = new MarkerClusterer({
        map: mapRef.current,
        markers: newMarkers
      });
    }
  }, [filteredServices]);

  const handleFilterChange = (newFilters: { types: string[], languages: string[] }) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  return (
    <div className="h-[calc(100vh-70px)] flex flex-col">
      <div className="bg-white p-4 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Find Services Near You</h2>
            {(loading || isLocating) && (
              <div className="flex items-center gap-2 text-blue-600">
                <LoaderIcon className="h-5 w-5 animate-spin" />
                <span>{isLocating ? 'Getting your location...' : 'Loading services...'}</span>
              </div>
            )}
          </div>
          
          <ServiceFilters 
            onFilterChange={handleFilterChange}
            availableLanguages={Array.from(
              new Set(services.flatMap(s => s.languages))
            )}
          />
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div ref={mapContainerRef} className="flex-1" />
    </div>
  );
}