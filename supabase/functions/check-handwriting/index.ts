// Supabase Edge Function: Handwriting checker
// Reads a photo of handwritten spelling answers (one word per line)
// and returns the recognized words in order.

const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `You are checking a child's handwritten spelling test.

The image shows a sheet of paper with handwritten answers, one per line (or one per row in a grid).
Items may be single words, multi-word phrases, or short sentences.

There are exactly WORD_COUNT items expected. Read that many entries from top to bottom.

Return ONLY a JSON array of lowercase strings, one per handwritten item, in order from top to bottom.
If a line is blank or unreadable, use "" (empty string) for that position.

Example output for 5 items: ["undeterred","infuriated","mustered up the courage","brimming with excitement","decades"]

Rules:
- Read exactly what is written — do NOT correct spelling mistakes
- Preserve the child's spelling even if wrong (that's the whole point — we're checking their spelling)
- All lowercase
- One entry per expected item (items may be single words or multi-word phrases)
- If you see fewer items than expected, pad with "" at the end`;

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — please sign in" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
                      Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { "Authorization": `Bearer ${token}`, "apikey": supabaseKey },
  });

  if (!userRes.ok) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get Gemini key
  const geminiKey = Deno.env.get("GEMINI_KEY");
  if (!geminiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { imageBase64, mimeType, wordCount } = await req.json();

    if (!imageBase64 || !mimeType || !wordCount) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64, mimeType, or wordCount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = PROMPT.replace("WORD_COUNT", String(wordCount));

    const geminiBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 512 },
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

    // Parse JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    let words: string[] = [];

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          words = parsed.map((w: unknown) => String(w ?? "").trim().toLowerCase());
        }
      } catch {
        // parse failed
      }
    }

    // Pad to expected count if needed
    while (words.length < wordCount) {
      words.push("");
    }

    return new Response(JSON.stringify({ words: words.slice(0, wordCount) }), {
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
