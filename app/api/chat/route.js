import OpenAI from "openai";
import { NextResponse } from "next/server";

// Initialize OpenRouter client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, 
});

export async function POST(req) {
  try {
    const { message, context } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Server Error: API Key missing." }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      // ✅ UPDATED: Using the DeepSeek model that works for your account
      model: "nex-agi/deepseek-v3.1-nex-n1:free",
      messages: [
        {
          role: "system",
          content: `You are a helpful financial assistant for "OnlyBanks". 
          The user has uploaded their bank statement. 
          Here is the JSON data of their transactions:
          ${JSON.stringify(context)}

          Answer the user's question based strictly on this data.
          - Be concise and friendly.
          - If asked about totals, calculate them from the data provided.
          - Format currency as GBP (£).`
        },
        { role: "user", content: message }
      ],
    });

    const reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat Error:", error);
    // Provide a more helpful error message
    return NextResponse.json({ error: "Failed to connect to AI (Model Error)." }, { status: 500 });
  }
}
