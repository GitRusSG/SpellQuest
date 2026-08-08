// Supabase Edge Function: OCR proxy for Gemini
// Keeps the Gemini API key server-side. Frontend sends image data,
// this function forwards it to Gemini and returns the result.

const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `You are processing a school spelling list sheet.

The image may contain ONE or MULTIPLE spelling lists on the same page.

Each spelling list typically has TWO sections:
1. A block of NUMBERED WORDS (single words or short phrases, in a table/grid)
2. A block of NUMBERED DICTATION SENTENCES (full sentences for dictation practice, often containing underlined or bold words)

Sometimes a list only has words and no sentences. Sometimes both.

For EACH spelling list you find:
1. Extract its name/title (e.g. "Spelling & Dictation 1 - Vocabulary for Writing")
2. Extract the numbered WORDS/PHRASES from the table (items 1-10 typically)
3. Extract the DICTATION SENTENCES separately (items 11, 12, 13 typically — full sentences)

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "name": "list name here",
    "words": ["undeterred", "infuriated", "mustered up the courage"],
    "sentences": [
      "The marvellous performance by the dancers is etched in my memory.",
      "I knew I had to face the daunting task of confessing, even if it meant getting into trouble."
    ]
  }
]

Rules:
- Words array: all lowercase. These are single words or short phrases from the numbered table.
- Sentences array: preserve original capitalization and punctuation. These are full dictation sentences.
- If there are no sentences for a list, use an empty array: "sentences": []
- Ignore handwritten annotations
- If no lists are found, return []`;

Deno.serve(async (req) => {
  // CORS headers for browser requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — please sign in" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify the JWT by calling Supabase Auth
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
                      Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": supabaseKey,
    },
  });

  if (!userRes.ok) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session — please sign in again" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get Gemini key from Supabase secrets
  const geminiKey = Deno.env.get("GEMINI_KEY");
  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_KEY not configured on server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 or mimeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Gemini
    const geminiBody = {
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    };

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: err?.error?.message || `Gemini HTTP ${geminiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON response from Gemini
    const match = text.match(/\[[\s\S]*\]/);
    let lists: { name: string; words: string[]; sentences: string[] }[] = [];

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          lists = parsed
            .map((item: { name?: string; words?: string[]; sentences?: string[] }) => ({
              name: String(item.name || "Spelling List").trim(),
              words: (Array.isArray(item.words) ? item.words : [])
                .map((w: string) => String(w).trim().toLowerCase())
                .filter((w: string) => w.length >= 2),
              sentences: (Array.isArray(item.sentences) ? item.sentences : [])
                .map((s: string) => String(s).trim())
                .filter((s: string) => s.length >= 5),
            }))
            .filter((item: { words: string[]; sentences: string[] }) =>
              item.words.length > 0 || item.sentences.length > 0);
        }
      } catch {
        // JSON parse failed — lists stays empty
      }
    }

    return new Response(JSON.stringify({ lists }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
