import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.8"
import { HfInference } from "npm:@huggingface/inference@2.6.4"

const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_KEY'))

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map of language codes to language names for MarianMT model
const languageModels: Record<string, string> = {
  "en": "English",
  "es": "Spanish",
  "fr": "French",
  "ar": "Arabic",
  "uk": "Ukrainian",
  "ru": "Russian",
  "de": "German",
  "zh": "Chinese",
  "fa": "Persian",
  "tr": "Turkish",
  "sw": "Swahili",
  "hi": "Hindi",
  "ur": "Urdu",
  "ps": "Pashto",
  "so": "Somali",
}

// Implement CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

interface ChatRequest {
  message: string
  language: string
  session_id: string
}

async function translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
  if (sourceLanguage === 'en') return text;
  
  try {
    const result = await hf.translation({
      model: `Helsinki-NLP/opus-mt-${sourceLanguage}-en`,
      inputs: text,
    });
    return result.translation_text;
  } catch (error) {
    console.error('Translation to English failed:', error);
    return text; // Fallback to original text
  }
}

async function translateFromEnglish(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'en') return text;
  
  try {
    const result = await hf.translation({
      model: `Helsinki-NLP/opus-mt-en-${targetLanguage}`,
      inputs: text,
    });
    return result.translation_text;
  } catch (error) {
    console.error('Translation from English failed:', error);
    return text; // Fallback to original text
  }
}

async function classifyIntent(text: string): Promise<string> {
  // Simple keyword-based intent detection as fallback
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('medical') || lowerText.includes('doctor') || 
      lowerText.includes('hospital') || lowerText.includes('clinic') || 
      lowerText.includes('health')) {
    return 'clinic';
  }
  
  if (lowerText.includes('shelter') || lowerText.includes('housing') || 
      lowerText.includes('place to stay') || lowerText.includes('homeless')) {
    return 'shelter';
  }
  
  if (lowerText.includes('legal') || lowerText.includes('lawyer') || 
      lowerText.includes('asylum') || lowerText.includes('refugee status')) {
    return 'legal';
  }
  
  if (lowerText.includes('food') || lowerText.includes('hungry') || 
      lowerText.includes('eat') || lowerText.includes('meal')) {
    return 'food';
  }
  
  if (lowerText.includes('school') || lowerText.includes('education') || 
      lowerText.includes('learn') || lowerText.includes('study') || 
      lowerText.includes('class')) {
    return 'education';
  }
  
  try {
    // Try zero-shot classification with a simpler model
    const result = await hf.zeroShotClassification({
      model: "facebook/bart-large-mnli",
      inputs: text,
      parameters: {
        candidate_labels: ["medical assistance", "shelter", "legal help", "food assistance", "education"],
        multi_label: false
      }
    });
    
    // Map the classification result to our intent types
    const labelMap: Record<string, string> = {
      "medical assistance": "clinic",
      "shelter": "shelter",
      "legal help": "legal",
      "food assistance": "food",
      "education": "education"
    };
    
    return labelMap[result.labels[0]] || 'general';
  } catch (error) {
    console.error('Zero-shot classification failed:', error);
    return 'general'; // Fallback to general intent
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    // Parse request
    const { message, language, session_id } = await req.json() as ChatRequest
    
    if (!message || !language || !session_id) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: message, language, and session_id are required" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }

    // Log the request (without sensitive data)
    console.log('Processing chat request:', { language, session_id })

    // 1. Translate incoming message to English
    const englishMessage = await translateToEnglish(message, language);

    // 2. Classify intent
    const intent = await classifyIntent(englishMessage);

    // 3. Get relevant services based on intent
    let services = [];
    if (intent !== "general") {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('type', intent)
        .limit(3);
      
      if (error) {
        console.error('Error fetching services:', error);
      } else {
        services = data;
      }
    }

    // 4. Generate English response
    let englishResponse = generateResponse(intent, services);

    // 5. Translate response to user's language
    const translatedResponse = await translateFromEnglish(englishResponse, language);

    // 6. Save assistant message to database
    const { data: msgData, error: msgError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: session_id,
        role: 'assistant',
        content: translatedResponse,
        language: language
      }])
      .select();

    if (msgError) {
      console.error("Error saving assistant message:", msgError);
    }

    return new Response(
      JSON.stringify({ 
        message: translatedResponse, 
        intent: intent,
        id: msgData?.[0]?.id
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});

function generateResponse(intent: string, services: any[]): string {
  let response = "";

  switch (intent) {
    case "clinic":
      if (services.length > 0) {
        response = `I found ${services.length} medical clinics that might help you:\n\n`;
        services.forEach((service, index) => {
          response += `${index + 1}. ${service.name}\n`;
          response += `   📍 Address: ${service.address}\n`;
          response += `   📞 Phone: ${service.phone}\n`;
          response += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            response += `   🌐 Website: ${service.website}\n`;
          }
          response += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
        response += "Would you like information about any other medical services?";
      } else {
        response = "I can help you find medical services. Please check our map for clinics near you, or provide your location for more specific recommendations.";
      }
      break;

    case "shelter":
      if (services.length > 0) {
        response = `I found ${services.length} shelters that might help you:\n\n`;
        services.forEach((service, index) => {
          response += `${index + 1}. ${service.name}\n`;
          response += `   📍 Address: ${service.address}\n`;
          response += `   📞 Phone: ${service.phone}\n`;
          response += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            response += `   🌐 Website: ${service.website}\n`;
          }
          response += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
        response += "Would you like information about other shelter options?";
      } else {
        response = "I can help you find shelter. Please check our map for shelters near you, or provide your location for more specific recommendations.";
      }
      break;

    case "legal":
      if (services.length > 0) {
        response = `I found ${services.length} legal aid services that might help you:\n\n`;
        services.forEach((service, index) => {
          response += `${index + 1}. ${service.name}\n`;
          response += `   📍 Address: ${service.address}\n`;
          response += `   📞 Phone: ${service.phone}\n`;
          response += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            response += `   🌐 Website: ${service.website}\n`;
          }
          response += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
        response += "Would you like information about other legal services?";
      } else {
        response = "I can help you find legal assistance. Please check our map for legal aid services near you, or provide your location for more specific recommendations.";
      }
      break;

    case "food":
      if (services.length > 0) {
        response = `I found ${services.length} food assistance services that might help you:\n\n`;
        services.forEach((service, index) => {
          response += `${index + 1}. ${service.name}\n`;
          response += `   📍 Address: ${service.address}\n`;
          response += `   📞 Phone: ${service.phone}\n`;
          response += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            response += `   🌐 Website: ${service.website}\n`;
          }
          response += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
        response += "Would you like information about other food assistance options?";
      } else {
        response = "I can help you find food assistance. Please check our map for food banks near you, or provide your location for more specific recommendations.";
      }
      break;

    case "education":
      if (services.length > 0) {
        response = `I found ${services.length} educational services that might help you:\n\n`;
        services.forEach((service, index) => {
          response += `${index + 1}. ${service.name}\n`;
          response += `   📍 Address: ${service.address}\n`;
          response += `   📞 Phone: ${service.phone}\n`;
          response += `   ✉️ Email: ${service.email}\n`;
          if (service.website) {
            response += `   🌐 Website: ${service.website}\n`;
          }
          response += `   🗣️ Languages: ${service.languages.join(', ')}\n\n`;
        });
        response += "Would you like information about other educational services?";
      } else {
        response = "I can help you find educational resources. Please check our map for educational services near you, or provide your location for more specific recommendations.";
      }
      break;

    default:
      response = "I'm here to help you find various services. Please let me know what type of assistance you need:\n\n" +
        "🏥 Medical clinics\n" +
        "🏠 Shelters\n" +
        "⚖️ Legal aid\n" +
        "🍲 Food assistance\n" +
        "📚 Educational resources\n\n" +
        "Just tell me which type of service you're looking for.";
  }

  return response;
}