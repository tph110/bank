import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message, context } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Server Error: API Key missing." }, { status: 500 });
    }

    // Using Google's Gemini Flash Lite (Free & Fast)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://onlybanks.vercel.app/", 
        "X-Title": "OnlyBanks",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
        messages: [
          {
            role: "system",
            content: `You are a helpful financial assistant for "OnlyBanks". 
            Here is the user's transaction data JSON:
            ${JSON.stringify(context)}

            Answer the user's question based strictly on this data.
            - Be concise and friendly.
            - Format currency as GBP (£).`
          },
          { role: "user", content: message }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter Error:", errorText);
      throw new Error(`OpenRouter Error: ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    return NextResponse.json({ error: "I'm having trouble connecting to the AI right now." }, { status: 500 });
  }
}
