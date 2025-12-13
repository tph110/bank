import OpenAI from "openai";
import { NextResponse } from "next/server";

// Initialize OpenRouter client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, // Reads from your .env.local file
});

export async function POST(req) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "No description provided" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "nex-agi/deepseek-v3.1-nex-n1:free", // The free model you requested
      messages: [
        {
          role: "system",
          content: "You are a precise financial assistant. Categorise the following bank transaction description into exactly ONE of these categories: [Groceries, Eating out, Transport, Shopping, Bills & Utilities, Tax, Insurance & Professional, Business Services, Health & Wellbeing, Subscriptions, Transfers, Income]. Return ONLY the category name. Do not add punctuation or extra words."
        },
        {
          role: "user",
          content: description
        }
      ],
      temperature: 0.1, // Low temperature for consistent answers
    });

    // Extract the answer
    let category = completion.choices[0].message.content.trim();

    // Cleanup: Remove any trailing periods or quotes if the AI adds them
    category = category.replace(/['".]/g, '');

    return NextResponse.json({ category });
    
  } catch (error) {
    console.error("AI Categorisation failed:", error);
    return NextResponse.json({ category: "Other" }, { status: 500 });
  }
}
