import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { totalSpent, totalIncome, topCategories, largestExpense, transactionCount, dateRange } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing API Key for insights");
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    console.log("📊 Generating AI insights...");

    // Calculate some additional useful metrics
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome * 100).toFixed(0) : 0;
    const avgTransactionSize = transactionCount > 0 ? (totalSpent / transactionCount).toFixed(2) : 0;

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
            content: `You are a financial advisor analyzing spending patterns. Generate exactly 3-4 concise, actionable insights.

RULES:
- Each insight must be under 100 characters
- Start each with an emoji (💰 🎯 ⚠️ 📊 💡 📈 📉 ☕ 🛒 🚗 etc.)
- Focus on: spending patterns, savings opportunities, anomalies, actionable advice
- Be specific with numbers and percentages
- Be encouraging but honest
- Avoid generic advice

FINANCIAL DATA:
- Period: ${dateRange || 'Recent transactions'}
- Total Spent: £${totalSpent.toFixed(2)}
- Total Income: £${totalIncome.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Top Spending Categories: ${topCategories.map(([cat, amt]) => `${cat} £${amt.toFixed(2)}`).join(', ')}
- Largest Single Expense: £${largestExpense.amount.toFixed(2)} at ${largestExpense.description}
- Transaction Count: ${transactionCount}
- Average Transaction: £${avgTransactionSize}

Return ONLY 3-4 insights, one per line. No numbering, no preamble, no explanations.`
          },
          { role: "user", content: "Analyze this financial data and provide insights." }
        ],
        temperature: 0.8,
        max_tokens: 350,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter error:", errorText);
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ AI insights generated");
    
    const rawInsights = data.choices?.[0]?.message?.content || "";
    
    // Parse the AI response into array of insights
    const insights = rawInsights
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length < 150) // Filter valid insights
      .slice(0, 4); // Take first 4 lines

    // If AI didn't generate enough insights, return error
    if (insights.length === 0) {
      throw new Error("AI generated no valid insights");
    }

    return NextResponse.json({ insights });

  } catch (error) {
    console.error("❌ Insights generation error:", error.message);
    return NextResponse.json({ 
      error: "Failed to generate insights",
      insights: null 
    }, { status: 500 });
  }
}
