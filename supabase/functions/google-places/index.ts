import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Validate required environment variables
if (!GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_PLACES_API_KEY environment variable');
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const fetchHeaders = {
  'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Map our service types to Google Places types
const typeMapping: Record<string, string[]> = {
  clinic: ['hospital', 'doctor', 'health'],
  shelter: ['lodging', 'local_government_office'],
  legal: ['lawyer'],
  food: ['food_bank', 'meal_delivery'],
  education: ['school', 'university'],
  other: ['point_of_interest']
};

async function retryFetch(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...fetchHeaders,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for URL ${url}:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (i === retries - 1) break;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError;
}

async function getCountryFromCoordinates(lat: number, lng: number): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await retryFetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const addressComponents = data.results[0].address_components;
      const countryComponent = addressComponents.find(
        (component: any) => component.types.includes('country')
      );
      
      if (countryComponent) {
        return countryComponent.long_name;
      }
    }
    throw new Error('Could not determine country from coordinates');
  } catch (error) {
    console.error('Error getting country from coordinates:', error);
    throw error;
  }
}

async function searchNearbyPlaces(location: { lat: number; lng: number }, type: string, radius: number = 5000) {
  const placeTypes = typeMapping[type] || ['point_of_interest'];
  const results = [];
  const country = await getCountryFromCoordinates(location.lat, location.lng);

  // Keep track of seen place IDs to prevent duplicates
  const seenPlaceIds = new Set<string>();

  for (const placeType of placeTypes) {
    try {
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        type: placeType,
        key: GOOGLE_API_KEY
      });

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
      console.log(`Fetching places for type: ${placeType}`);
      
      const response = await retryFetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        console.log(`Found ${data.results.length} places for type: ${placeType}`);
        
        // Filter out duplicates before getting details
        const uniquePlaces = data.results.filter((place: any) => {
          if (seenPlaceIds.has(place.place_id)) {
            return false;
          }
          seenPlaceIds.add(place.place_id);
          return true;
        });

        // Get details for each unique place
        const detailedResults = await Promise.allSettled(
          uniquePlaces.map(async (place: any) => {
            try {
              const details = await getPlaceDetails(place.place_id);
              return {
                ...place,
                ...details,
                country // Add country information
              };
            } catch (error) {
              console.error(`Failed to get details for place ${place.place_id}:`, error);
              return place;
            }
          })
        );
        
        // Filter out rejected promises and add successful results
        results.push(...detailedResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value)
        );
      } else if (data.status === 'ZERO_RESULTS') {
        console.log(`No results found for type: ${placeType}`);
      } else {
        console.error(`Google Places API error: ${data.status}, message: ${data.error_message || 'No error message'}`);
      }
    } catch (error) {
      console.error(`Error fetching places for type ${placeType}:`, error);
    }
  }

  return results;
}

async function getPlaceDetails(placeId: string) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,geometry,international_phone_number',
    key: GOOGLE_API_KEY
  });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  console.log(`Fetching details for place: ${placeId}`);

  try {
    const response = await retryFetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      return data.result;
    }
    if (data.status !== 'OK') {
      console.error('Place details API error:', data.status, data.error_message);
    }
    return null;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key before processing request
    if (!GOOGLE_API_KEY) {
      throw new Error("Google Places API key is not configured");
    }

    const { location, type, radius } = await req.json();

    // Validate required parameters
    if (!type) {
      throw new Error("Service type is required");
    }

    // Set default location if not provided
    const searchLocation = location && typeof location === 'object' && 
                         typeof location.lat === 'number' && 
                         typeof location.lng === 'number'
      ? location
      : { lat: 0, lng: 0 }; // Default to null island if no location provided

    console.log(`Processing request for type: ${type} at location: ${searchLocation.lat},${searchLocation.lng}`);

    // Search for nearby places
    const places = await searchNearbyPlaces(searchLocation, type, radius || 50000);
    console.log(`Found ${places.length} total places`);

    // Format places for our database schema
    const formattedPlaces = places.map(place => ({
      name: place.name,
      type,
      address: place.formatted_address || place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      phone: place.formatted_phone_number || place.international_phone_number || '',
      email: '', // Google Places API doesn't provide email
      website: place.website || '',
      hours: place.opening_hours?.weekday_text?.join('; ') || '',
      google_place_id: place.place_id,
      source: 'GooglePlaces',
      country: place.country, // Include country information
      languages: ['en'], // Default to English as Google doesn't provide language info
      description: `Service data from Google Places: ${place.name}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Store in database if we have results
    if (formattedPlaces.length > 0) {
      console.log(`Upserting ${formattedPlaces.length} places to database`);
      
      // Process places in batches to avoid conflicts
      const batchSize = 10;
      for (let i = 0; i < formattedPlaces.length; i += batchSize) {
        const batch = formattedPlaces.slice(i, i + batchSize);
        const { error: upsertError } = await supabase
          .from('services')
          .upsert(
            batch,
            {
              onConflict: 'google_place_id',
              ignoreDuplicates: false // Update existing records
            }
          );

        if (upsertError) {
          console.error('Error upserting places batch:', upsertError);
          throw upsertError;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: formattedPlaces.length,
        services: formattedPlaces 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});