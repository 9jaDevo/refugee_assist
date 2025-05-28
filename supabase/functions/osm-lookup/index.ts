import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const fetchHeaders = {
  'User-Agent': 'Supabase Edge Function/1.0',
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded'
};

interface OverpassResult {
  elements: Array<{
    id: number;
    type: string;
    lat: number;
    lon: number;
    tags: {
      name?: string;
      amenity?: string;
      'social_facility'?: string;
      'healthcare'?: string;
      'addr:full'?: string;
      phone?: string;
      email?: string;
      website?: string;
      opening_hours?: string;
      'contact:phone'?: string;
      'contact:email'?: string;
    };
  }>;
}

async function retryFetch(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...fetchHeaders
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (i === retries - 1) break;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError;
}

function mapOsmTypeToServiceType(tags: any): string | null {
  if (tags.healthcare === 'clinic' || tags.healthcare === 'doctor') return 'clinic';
  if (tags.social_facility === 'shelter') return 'shelter';
  if (tags.amenity === 'social_facility' && tags.social_facility === 'food_bank') return 'food';
  if (tags.amenity === 'social_facility' && tags.social_facility === 'refugee_site') return 'shelter';
  if (tags.amenity === 'school' || tags.amenity === 'language_school') return 'education';
  if (tags.office === 'ngo' || tags.amenity === 'social_facility') return 'other';
  return null;
}

async function fetchOsmServices(country: string, bbox: string) {
  const query = `
    [out:json][timeout:25];
    area["name"="${country}"]["admin_level"~"2|4"]["boundary"="administrative"]->.searchArea;
    (
      node["healthcare"~"clinic|doctor"](area.searchArea);
      node["social_facility"="shelter"](area.searchArea);
      node["amenity"="social_facility"]["social_facility"="food_bank"](area.searchArea);
      node["amenity"="social_facility"]["social_facility"="refugee_site"](area.searchArea);
      node["amenity"~"school|language_school"](area.searchArea);
      node["office"="ngo"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await retryFetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
    });

    const data: OverpassResult = await response.json();
    
    return data.elements.map(element => ({
      osm_id: `${element.type}/${element.id}`,
      name: element.tags.name || 'Unnamed Service',
      type: mapOsmTypeToServiceType(element.tags) || 'other',
      address: element.tags['addr:full'] || '',
      latitude: element.lat,
      longitude: element.lon,
      phone: element.tags.phone || element.tags['contact:phone'] || '',
      email: element.tags.email || element.tags['contact:email'] || '',
      website: element.tags.website || '',
      hours: element.tags.opening_hours || '',
      source: 'OSM',
      country: country
    }));
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw new Error(`Failed to fetch OSM data: ${error.message}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, bbox } = await req.json();

    if (!country) {
      throw new Error("Country is required");
    }

    const osmServices = await fetchOsmServices(country, bbox);

    if (osmServices.length > 0) {
      // First, delete existing OSM services for this country to prevent conflicts
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('source', 'OSM')
        .eq('country', country);

      if (deleteError) {
        throw new Error(`Failed to clean up existing OSM services: ${deleteError.message}`);
      }

      // Then insert new OSM services with created_by set to null since they are system-imported
      const { error: insertError } = await supabase
        .from('services')
        .insert(
          osmServices.map(service => ({
            ...service,
            created_by: null, // Set to null for system-imported services
            languages: ['en'],
            description: `Service data from OpenStreetMap: ${service.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        );

      if (insertError) {
        throw new Error(`Failed to insert OSM services: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: osmServices.length,
        services: osmServices 
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