import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const audioBuffer = await req.arrayBuffer();
    console.log("claw-upload-audio: received bytes:", audioBuffer.byteLength, "content-type:", req.headers.get("content-type"));
    if (!audioBuffer.byteLength) {
      return new Response(JSON.stringify({ error: "Empty audio data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;

    // Use service role to bypass RLS
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.storage
      .from("claw-images")
      .upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg", upsert: false });

    if (error) {
      console.error("Storage upload error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: { publicUrl } } = adminClient.storage.from("claw-images").getPublicUrl(data.path);
    console.log("Audio uploaded:", publicUrl);

    return new Response(JSON.stringify({ audio_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Upload error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
