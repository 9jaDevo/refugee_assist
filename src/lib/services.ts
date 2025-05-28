import { supabase } from './supabase';

async function retryFetch(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      // Add error handling for undefined URL
      if (!url) {
        throw new Error('URL is undefined');
      }

      // Verify Supabase URL is available
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      // Add proper headers including anon key for authentication
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Log the request attempt (without sensitive data)
      console.debug(`Attempt ${i + 1} to fetch from ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      console.warn(`Attempt ${i + 1} failed:`, lastError.message);
      
      if (i === retries - 1) break;
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const delay = Math.min(backoff * Math.pow(2, i) + jitter, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function searchServices(type: string, country: string, userLocation?: { lat: number; lng: number }) {
  try {
    // First get services from our database
    const { data: internalServices, error: dbError } = await supabase
      .from('services')
      .select('*')
      .eq('type', type)
      .eq('country', country)
      .eq('source', 'manual');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Then fetch external services in parallel, with error handling for each service
    const [osmResponse, googleResponse] = await Promise.allSettled([
      // Fetch OSM data with retry
      (async () => {
        try {
          const response = await retryFetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/osm-lookup`,
            {
              method: 'POST',
              body: JSON.stringify({ country }),
            }
          );
          return await response.json();
        } catch (error) {
          console.warn('OSM service lookup failed:', error);
          return { services: [] };
        }
      })(),
      // Fetch Google Places data with retry
      (async () => {
        try {
          const response = await retryFetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-places`,
            {
              method: 'POST',
              body: JSON.stringify({
                location: userLocation || null,
                type,
                radius: userLocation ? 5000 : 50000 // Use smaller radius with precise location
              }),
            }
          );
          return await response.json();
        } catch (error) {
          console.warn('Google Places lookup failed:', error);
          return { services: [] };
        }
      })()
    ]);

    // Process responses, with safe fallbacks
    const osmData = osmResponse.status === 'fulfilled' ? osmResponse.value : { services: [] };
    const googleData = googleResponse.status === 'fulfilled' ? googleResponse.value : { services: [] };

    // Log any service failures for monitoring
    if (osmResponse.status === 'rejected') {
      console.warn('OSM service lookup failed:', osmResponse.reason);
    }
    if (googleResponse.status === 'rejected') {
      console.warn('Google Places lookup failed:', googleResponse.reason);
    }

    // Combine all services and sort them
    const allServices = [
      // Internal services first (verified)
      ...(internalServices || []).map(service => ({
        ...service,
        priority: 1, // Highest priority for verified services
        badge: 'Verified'
      })),
      // OSM services second
      ...(osmData.services || []).map(service => ({
        ...service,
        priority: 2,
        badge: 'OSM'
      })),
      // Google Places services last
      ...(googleData.services || []).map(service => ({
        ...service,
        priority: 3,
        badge: 'GooglePlaces'
      }))
    ];

    // Sort by priority and limit to 5 results
    const sortedServices = allServices
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);

    return {
      internal: sortedServices.filter(s => s.priority === 1),
      osm: sortedServices.filter(s => s.priority === 2),
      google: sortedServices.filter(s => s.priority === 3),
      error: null
    };
  } catch (error) {
    console.error('Error searching services:', error);
    return {
      internal: [],
      osm: [],
      google: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function detectLocation(): Promise<{ country: string; error: string | null }> {
  try {
    // Get user's precise location first
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

    // Verify Supabase URL and anon key are available
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured');
    }
    if (!supabaseAnonKey) {
      throw new Error('Supabase anonymous key is not configured');
    }

    // First try country.is
    try {
      const response = await retryFetch('https://api.country.is', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.country) {
        // Convert country code to full name
        const countryResponse = await retryFetch(
          `https://restcountries.com/v3.1/alpha/${data.country}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        
        const [countryData] = await countryResponse.json();
        
        if (countryData?.name?.common) {
          return {
            country: countryData.name.common,
            error: null
          };
        }
      }
    } catch (error) {
      console.warn('country.is lookup failed:', error);
      // Continue to fallback
    }

    // Fallback to reverse geocoding with coordinates
    const response = await retryFetch(
      `${supabaseUrl}/functions/v1/get-location`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      }
    );

    const data = await response.json();
    
    if (!data.success || data.error) {
      throw new Error(data.details || data.error || 'Location detection failed');
    }

    if (!data.country) {
      throw new Error('No country information received');
    }

    return {
      country: data.country,
      error: null
    };
  } catch (error) {
    console.error('Location detection error:', error);
    
    return {
      country: '',
      error: error instanceof Error 
        ? `Unable to detect location automatically: ${error.message}. Please select your country manually.`
        : 'Location detection failed. Please select your country manually.'
    };
  }
}

export async function processMessage(message: string, language: string, sessionId: string, country: string) {
  try {
    // Get user's location if available
    let userLocation: { lat: number; lng: number } | undefined;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (error) {
      console.warn('Failed to get user location:', error);
      // Continue without user location
    }

    // Verify Supabase URL and anon key are available
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured');
    }
    if (!supabaseAnonKey) {
      throw new Error('Supabase anonymous key is not configured');
    }

    // Log the request (without sensitive data)
    console.debug('Processing message:', { language, sessionId, country });

    // First, get intent from chat function with retry
    const chatResponse = await retryFetch(
      `${supabaseUrl}/functions/v1/chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          language,
          session_id: sessionId,
        }),
      }
    );

    const chatData = await chatResponse.json();
    
    if (chatData.error) {
      throw new Error(`Chat function error: ${chatData.error}`);
    }

    const { intent } = chatData;

    // If we have a valid service type intent, search for services
    if (['clinic', 'shelter', 'legal', 'food', 'education'].includes(intent)) {
      const { internal, osm, google, error } = await searchServices(intent, country, userLocation);
      
      if (error) {
        throw new Error(error);
      }

      // Format service results with clear sections and better formatting
      let responseMessage = `Here are the top 5 ${intent} services that might help you:\n\n`;

      if (internal.length > 0) {
        internal.forEach((service, index) => {
          responseMessage += `${index + 1}. ${service.name} [${service.badge}]\n`;
          responseMessage += `   📌 Address: ${service.address}\n`;
          responseMessage += `   📞 Phone: ${service.phone}\n`;
          responseMessage += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            responseMessage += `   🌐 Website: ${service.website}\n`;
          }
          responseMessage += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
      }

      if (osm.length > 0) {
        osm.forEach((service, index) => {
          responseMessage += `${index + internal.length + 1}. ${service.name} [${service.badge}]\n`;
          responseMessage += `   📌 Address: ${service.address}\n`;
          if (service.phone) {
            responseMessage += `   📞 Phone: ${service.phone}\n`;
          }
          if (service.website) {
            responseMessage += `   🌐 Website: ${service.website}\n`;
          }
          responseMessage += `\n`;
        });
      }

      if (google.length > 0) {
        google.forEach((service, index) => {
          responseMessage += `${index + internal.length + osm.length + 1}. ${service.name} [${service.badge}]\n`;
          responseMessage += `   📌 Address: ${service.address}\n`;
          if (service.phone) {
            responseMessage += `   📞 Phone: ${service.phone}\n`;
          }
          if (service.website) {
            responseMessage += `   🌐 Website: ${service.website}\n`;
          }
          responseMessage += `\n`;
        });
      }

      if (internal.length === 0 && osm.length === 0 && google.length === 0) {
        responseMessage = `I couldn't find any ${intent} services in ${country} at the moment. You can:\n\n` +
          `1. Try searching for a different type of service\n` +
          `2. Check back later as our database is regularly updated\n` +
          `3. Visit the map view to see all available services in your area`;
      } else {
        responseMessage += `\n🔎 To see more options, please switch to map view.\n\n` +
          `Would you like information about any other type of service?`;
      }

      return {
        message: responseMessage,
        intent,
        error: null
      };
    }

    // For non-service intents, return a helpful message with available options
    return {
      message: `I can help you find various services in ${country}. Please let me know what type of assistance you need:\n\n` +
        `🏥 Medical clinics\n` +
        `🏠 Shelters\n` +
        `⚖️ Legal aid\n` +
        `🍲 Food assistance\n` +
        `📚 Educational resources\n\n` +
        `Just tell me which type of service you're looking for.`,
      intent: 'general',
      error: null
    };

  } catch (error) {
    console.error('Error processing message:', error);
    return {
      message: error instanceof Error 
        ? `I apologize, but I encountered an error: ${error.message}. Please try again or rephrase your question.`
        : 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
      intent: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}