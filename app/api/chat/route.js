import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message, context } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing API Key");
      return NextResponse.json({ error: "Server Error: API Key missing" }, { status: 500 });
    }

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
        // ✅ CHANGED: Using Meta Llama instead of Gemini (more reliable free tier)
        model: "meta-llama/llama-3.2-3b-instruct:free",
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
        temperature: 0.7,
        max_tokens: 500,
      })
    });

    console.log("📥 OpenRouter status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter Error Details:", errorText);
      
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        console.error("Could not parse error JSON");
      }

      console.error("Full error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      // Handle 429 rate limit with user-friendly message
      if (response.status === 429) {
        return NextResponse.json({ 
          error: "The AI is experiencing high traffic. Please try again in a moment.",
        }, { status: 429 });
      }

      return NextResponse.json({ 
        error: `AI service error (${response.status}). Please try again.`,
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
    }, { status: 500 });
  }
}
