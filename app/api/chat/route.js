import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message, context } = await req.json();

    const systemPrompt = `
      You are a helpful financial assistant for "OnlyBanks". 
      The user has uploaded their bank statement. 
      Here is the JSON data of their transactions:
      ${JSON.stringify(context)}

      Answer the user's question based strictly on this data.
      - Be concise and friendly.
      - If asked about totals, calculate them from the data provided.
      - Format currency as GBP (£).
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL, 
        "X-Title": process.env.SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3-8b-instruct:free", // Or any model you prefer
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": message }
        ]
      })
    });

    const data = await response.json();
    
    // Check for OpenRouter errors
    if (data.error) throw new Error(data.error.message);
    
    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to get answer from AI." }, { status: 500 });
  }
}
