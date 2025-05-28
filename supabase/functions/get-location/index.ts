import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

interface LocationResponse {
  country?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
  service?: string;
}

async function fetchWithTimeout(url: string, timeout = 5000, retries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      console.log(`Attempt ${i + 1}: Fetching from ${url}`);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ServiceLocator/1.0)',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      console.warn(`Attempt ${i + 1} failed:`, {
        url,
        error: lastError.message,
        errorName: lastError.name
      });
      
      if (i === retries - 1) break;
      
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

async function tryCountryIs(): Promise<LocationResponse> {
  try {
    console.log('Attempting to fetch location from country.is...');
    const response = await fetchWithTimeout('https://api.country.is', 3000);
    const data = await response.json();
    
    if (!data.country) {
      throw new Error('No country information received from country.is');
    }
    
    // Convert country code to full name
    const countryResponse = await fetchWithTimeout(
      `https://restcountries.com/v3.1/alpha/${data.country}`,
      3000
    );
    const [countryData] = await countryResponse.json();
    
    if (!countryData?.name?.common) {
      throw new Error('Could not resolve country name');
    }
    
    console.log('Successfully retrieved location from country.is');
    return {
      country: countryData.name.common,
      service: 'country.is'
    };
  } catch (error) {
    console.error('country.is error:', error);
    throw error;
  }
}

async function tryIpApiCom(): Promise<LocationResponse> {
  try {
    console.log('Attempting to fetch location from ip-api.com...');
    const response = await fetchWithTimeout('http://ip-api.com/json/?fields=status,message,country,lat,lon', 3000);
    const data = await response.json();
    
    if (data.status === 'fail') {
      throw new Error(`ip-api.com error: ${data.message}`);
    }
    
    if (!data.country) {
      throw new Error('No country information received from ip-api.com');
    }
    
    console.log('Successfully retrieved location from ip-api.com');
    return {
      country: data.country,
      latitude: data.lat,
      longitude: data.lon,
      service: 'ip-api.com'
    };
  } catch (error) {
    console.error('ip-api.com error:', error);
    throw error;
  }
}

async function tryIpApi(): Promise<LocationResponse> {
  try {
    console.log('Attempting to fetch location from ipapi.co...');
    const response = await fetchWithTimeout('https://ipapi.co/json/', 3000);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`ipapi.co error: ${data.error}`);
    }
    
    if (!data.country_name) {
      throw new Error('No country information received from ipapi.co');
    }
    
    console.log('Successfully retrieved location from ipapi.co');
    return {
      country: data.country_name,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      service: 'ipapi.co'
    };
  } catch (error) {
    console.error('ipapi.co error:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try each service in sequence, starting with country.is
    const services = [tryCountryIs, tryIpApiCom, tryIpApi];
    const errors: string[] = [];
    
    for (const service of services) {
      try {
        const location = await service();
        if (location.country) {
          console.log(`Successfully retrieved location using ${service.name}`);
          return new Response(
            JSON.stringify({
              ...location,
              success: true
            }),
            { 
              headers: {
                ...corsHeaders,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            }
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${service.name}: ${errorMessage}`);
        console.log(`${service.name} failed, trying next service...`);
        continue;
      }
    }

    // If we get here, all services failed
    throw new Error(`All geolocation services failed: ${errors.join('; ')}`);

  } catch (error) {
    console.error('Error getting location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        error: 'Location detection failed',
        details: 'Unable to detect location. Please select your country manually.',
        message: errorMessage,
        success: false
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
});