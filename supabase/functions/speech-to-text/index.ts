import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from "npm:@huggingface/inference@2.6.4"

const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_KEY'))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const language = formData.get('language') || 'en'
    
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }

    // Convert audio to blob for Whisper API
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type })

    // Use Whisper model for transcription
    const result = await hf.automaticSpeechRecognition({
      model: 'openai/whisper-large-v3',
      data: audioBlob,
      parameters: {
        language: language,
        task: 'transcribe'
      }
    })
    
    return new Response(
      JSON.stringify({ 
        text: result.text,
        language: language
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
    
  } catch (error) {
    console.error("Error processing speech:", error)
    
    return new Response(
      JSON.stringify({ 
        error: "Error processing speech to text",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }
})