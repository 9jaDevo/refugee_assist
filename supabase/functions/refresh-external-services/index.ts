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

async function fetchExternalServices() {
  try {
    // Fetch from multiple sources in parallel
    const [refugeeInfoServices, unhcrServices, reliefWebServices] = await Promise.all([
      fetchFromRefugeeInfo(),
      fetchFromUNHCR(),
      fetchFromReliefWeb()
    ]);

    // Combine all services
    const allServices = [
      ...refugeeInfoServices,
      ...unhcrServices,
      ...reliefWebServices
    ];

    // Update database
    const { error } = await supabase
      .from('external_services')
      .upsert(
        allServices.map(service => ({
          ...service,
          last_fetched_at: new Date().toISOString()
        })),
        { onConflict: 'name,source' }
      );

    if (error) throw error;

    return { success: true, count: allServices.length };
  } catch (error) {
    console.error('Error refreshing external services:', error);
    throw error;
  }
}

async function fetchFromRefugeeInfo() {
  // Implementation for fetching from Refugee.Info API
  return [];
}

async function fetchFromUNHCR() {
  // Implementation for fetching from UNHCR API
  return [];
}

async function fetchFromReliefWeb() {
  // Implementation for fetching from ReliefWeb API
  return [];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await fetchExternalServices();
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to refresh external services" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});