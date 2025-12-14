import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message, context } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing API Key");
      return NextResponse.json({ error: "Server Error: API Key missing" }, { status: 500 });
    }

    // ✅ CRITICAL FIX: The model name might be incorrect or the free tier might have issues
    // Let's try with a fallback model and better error handling
    
    console.log("📤 Attempting OpenRouter API call...");
    console.log("📊 Context items:", context?.length || 0);
    console.log("💬 Message length:", message?.length || 0);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://onlybanks.vercel.app/",
        "X-Title": "OnlyBanks",
      },
      body: JSON.stringify({
        // ✅ FIX 1: Try the stable model name format
        model: "google/gemini-flash-1.5",
        messages: [
          {
            role: "system",
            content: `You are a helpful financial assistant for "OnlyBanks". 
            Here is the user's transaction data JSON:
            ${JSON.stringify(context || []).substring(0, 2000)}

            Answer the user's question based strictly on this data.
            - Be concise and friendly.
            - Format currency as GBP (£).`
          },
          { role: "user", content: message }
        ],
        // ✅ FIX 2: Add these parameters for better compatibility
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    console.log("📥 OpenRouter status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter Error Details:", errorText);
      
      // Parse the error to provide helpful feedback
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        console.error("Could not parse error JSON");
      }

      // Log the full error for debugging
      console.error("Full error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      // Return user-friendly error
      return NextResponse.json({ 
        error: `OpenRouter API error (${response.status}): ${errorJson?.error?.message || errorText.substring(0, 100)}`,
        technicalDetails: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }

    const data = await response.json();
    console.log("✅ Got successful response from OpenRouter");
    
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    console.error("❌ Full error:", error);
    
    return NextResponse.json({ 
      error: "I'm having trouble connecting to the AI right now. Please try again later.",
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
