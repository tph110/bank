import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { description } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing API Key");
      return NextResponse.json({ error: "Server Error: API Key missing" }, { status: 500 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://onlybanks.vercel.app/", 
        "X-Title": "OnlyBanks",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct",  // ✅ CORRECT MODEL
        messages: [
          {
            role: "system",
            content: "You are a precise financial assistant. Categorise the transaction description into exactly ONE of: [Groceries, Eating out, Transport, Shopping, Bills & Utilities, Tax, Insurance & Professional, Business Services, Health & Wellbeing, Subscriptions, Transfers, Income]. Return ONLY the category name. No punctuation."
          },
          { role: "user", content: description }
        ],
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter Error:", errorText);
      throw new Error(`OpenRouter responded with ${response.status}: ${errorText}`);  // ✅ FIXED THIS LINE
    }

    const data = await response.json();
    let category = data.choices[0]?.message?.content?.trim() || "Other";
    category = category.replace(/['".]/g, ''); // Clean up
    
    return NextResponse.json({ category });

  } catch (error) {
    console.error("❌ Categorisation Failed:", error.message);
    // Return 'Other' so the UI doesn't break, but log the real error above
    return NextResponse.json({ category: "Other" });
  }
}
