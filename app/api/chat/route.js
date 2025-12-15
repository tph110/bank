import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message, context } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing API Key");
      return NextResponse.json({ error: "Server Error: API Key missing" }, { status: 500 });
    }

    console.log("📤 Sending to AI...");

    // ✅ Format the context nicely for the AI
    const formattedContext = context ? `
FINANCIAL SUMMARY (${context.dateRange}):

OVERALL:
- Total Spent: £${context.totalExpenses.toFixed(2)}
- Total Income: £${context.totalIncome.toFixed(2)}
- Net Balance: £${(context.totalIncome - context.totalExpenses).toFixed(2)}
- Total Transactions: ${context.transactionCount} (${context.expenseCount} expenses, ${context.incomeCount} income)

SPENDING BY CATEGORY:
${Object.entries(context.categoryBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amount]) => `- ${cat}: £${amount.toFixed(2)}`)
  .join('\n')}

COFFEE & CAFE SPENDING:
- Total on Coffee/Cafes: £${context.coffeeSpending.total.toFixed(2)}
- Number of Coffee Purchases: ${context.coffeeSpending.count}
${context.coffeeSpending.count > 0 ? `- Recent Coffee Transactions:\n  ${context.coffeeSpending.transactions.join('\n  ')}` : ''}

TOP 20 MERCHANTS:
${context.topMerchants.join('\n')}
` : "No transaction data available.";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "https://onlybanks.vercel.app/",
        "X-Title": "OnlyBanks",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct",
        messages: [
          {
            role: "system",
            content: `You are a helpful financial assistant for "OnlyBanks".

Below is a summary of the user's transaction data.

${formattedContext}

Answer the user's question based strictly on this data.

IMPORTANT INSTRUCTIONS:
- Be specific with amounts and dates when available
- Format all currency as GBP with £ symbol
- Be friendly, concise, and helpful
- When asked about coffee, cafes, or similar purchases, check the "COFFEE & CAFE SPENDING" section
- Pret A Manger, Costa, Starbucks, Caffe Nero, Greggs coffee = all count as coffee spending
- When asked about specific categories, use the "SPENDING BY CATEGORY" section
- When asked about merchants or shops, use the "TOP 20 MERCHANTS" section
- If asked about something not in the data, say you don't see that information
- Never make up numbers or transactions`
          },
          { role: "user", content: message }
        ],
        temperature: 0.5,
        max_tokens: 400,
      })
    });

    console.log("📥 AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ AI Error:", errorText);
      
      if (response.status === 429) {
        return NextResponse.json({ 
          error: "The AI is busy right now. Please try again in a moment.",
        }, { status: 429 });
      }

      return NextResponse.json({ 
        error: `AI service error. Please try again.`,
      }, { status: 500 });
    }

    const data = await response.json();
    console.log("✅ Got AI response");
    
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    
    return NextResponse.json({ 
      error: "I'm having trouble connecting right now. Please try again.",
    }, { status: 500 });
  }
}
