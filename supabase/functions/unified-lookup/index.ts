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

interface ExternalService {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  source: string;
}

async function fetchRefugeeInfoServices(type: string, country: string): Promise<ExternalService[]> {
  try {
    const response = await fetch(
      `https://www.refugee.info/api/v2/services/search/?type=${type}&country=${country}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.results.map((result: any) => ({
      name: result.name,
      type: result.type,
      address: result.address,
      phone: result.phone_number,
      email: result.email,
      website: result.website,
      source: 'Refugee.Info'
    }));
  } catch (error) {
    console.error('Error fetching from Refugee.Info:', error);
    return [];
  }
}

async function fetchUNHCRServices(type: string, country: string): Promise<ExternalService[]> {
  try {
    const response = await fetch(
      `https://api.unhcr.org/population/v1/services?type=${type}&country=${country}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items.map((item: any) => ({
      name: item.name,
      type: item.service_type,
      address: item.location,
      phone: item.contact_phone,
      email: item.contact_email,
      website: item.website,
      source: 'UNHCR'
    }));
  } catch (error) {
    console.error('Error fetching from UNHCR:', error);
    return [];
  }
}

async function fetchReliefWebServices(type: string, country: string): Promise<ExternalService[]> {
  try {
    const response = await fetch(
      `https://api.reliefweb.int/v1/reports?appname=refugeeassist&query[value]=${type}+${country}&query[fields][]=title&query[fields][]=body-html`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.data.map((item: any) => ({
      name: item.fields.title,
      type,
      address: country,
      phone: '',
      email: '',
      website: item.fields.url,
      source: 'ReliefWeb'
    }));
  } catch (error) {
    console.error('Error fetching from ReliefWeb:', error);
    return [];
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, country } = await req.json();

    if (!type || !country) {
      return new Response(
        JSON.stringify({ error: "Type and country are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch internal services
    const { data: internalServices, error: dbError } = await supabase
      .from('services')
      .select('*')
      .eq('type', type)
      .eq('country', country);

    if (dbError) throw dbError;

    // Fetch external services in parallel
    const [
      refugeeInfoServices,
      unhcrServices,
      reliefWebServices
    ] = await Promise.all([
      fetchRefugeeInfoServices(type, country),
      fetchUNHCRServices(type, country),
      fetchReliefWebServices(type, country)
    ]);

    // Combine and format results
    const results = {
      internal: internalServices || [],
      external: [
        ...refugeeInfoServices,
        ...unhcrServices,
        ...reliefWebServices
      ]
    };

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});