import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { totalSpent, totalIncome, topCategories, largestExpense, transactionCount, dateRange, totalTransfers } = await req.json();
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
            content: `You are an enthusiastic financial advisor analyzing spending patterns. You MUST generate exactly 3-4 separate insights.

CRITICAL RULES:
- Generate EXACTLY 3-4 insights (no more, no less)
- Each insight must be under 110 characters (be concise!)
- Start each with an emoji (💰 🎯 ⚠️ 📊 💡 📈 📉 ☕ 🛒 🚗 etc.)
- Each insight must be on a separate line
- Focus on: spending patterns, savings opportunities, actionable advice
- Be specific with numbers and percentages
- Be genuinely encouraging and enthusiastic for good financial behavior
- IMPORTANT: Transfers to savings accounts are NOT expenses - they are saving!

TONE GUIDELINES:
- Savings rate >50%: "Outstanding!", "Exceptional!", "Excellent!", "Brilliant!"
- Savings rate 30-50%: "Great job!", "Strong!", "Well done!"
- Savings rate 15-30%: "Good", "Solid", "Nice work"
- Savings rate <15%: Suggest gentle improvements with encouragement

FINANCIAL DATA:
- Period: ${dateRange || 'Recent transactions'}
- Total Spent: £${totalSpent.toFixed(2)} (EXCLUDES transfers to savings)
- Total Income: £${totalIncome.toFixed(2)}
- Transfers to Savings: £${(totalTransfers || 0).toFixed(2)} (This is SAVING, not spending!)
- Savings Rate: ${savingsRate}% (based on actual spending, excluding transfers)
- Top Spending Categories: ${topCategories.map(([cat, amt]) => `${cat} £${amt.toFixed(2)}`).join(', ')}
- Largest Single Expense: £${largestExpense.amount.toFixed(2)} at ${largestExpense.description}
- Transaction Count: ${transactionCount}
- Average Transaction: £${avgTransactionSize}

UK BENCHMARKS FOR COMPARISON:
- UK average savings rate: 12-15%
- UK average coffee spending: £28/month
- UK average grocery spending: £175/month (single person), £400/month (family of 4)
- UK average eating out: £65/month
- UK average transport: £85/month

KEY PRINCIPLES:
- Savings rate >30% is ABOVE AVERAGE - celebrate this!
- Savings rate >50% is EXCEPTIONAL - be enthusiastic!
- If transfers to savings are high (£1000+), PRAISE this strongly
- Focus on recurring spending categories (groceries, eating out, subscriptions, transport)
- Compare spending to UK averages where relevant
- Avoid commenting on one-off purchases
- Be specific with savings suggestions (e.g., "could save £X/month by...")
- If spending is already low in a category, acknowledge it positively

IMPORTANT: You MUST return EXACTLY 3-4 insights. Each insight on its own line. Keep each under 110 characters.

Example format:
💰 Outstanding 87% savings rate - well above UK average of 15%!
📊 Groceries at £245 is above typical £175. Meal planning could save £70/month.
☕ Coffee spending £28 matches UK average perfectly - well controlled!
🎯 Keep up the excellent financial discipline!

Now generate 3-4 insights for the user's data. MUST be 3-4 separate lines. NO numbering, NO preamble.`
          },
          { role: "user", content: "Generate exactly 3-4 financial insights, one per line, each under 110 characters." }
        ],
        temperature: 0.7,  // ✅ Reduced from 0.8 for more consistency
        max_tokens: 400,  // ✅ Increased from 350 to give more room
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
    console.log("📝 Raw AI output:", rawInsights);  // ✅ Debug logging
    
    // Parse the AI response into array of insights
    const insights = rawInsights
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove empty lines and lines that are too long
        if (line.length === 0) return false;
        if (line.length > 180) {  // ✅ Increased from 150 to be more lenient
          console.log(`⚠️ Skipping long insight (${line.length} chars):`, line);
          return false;
        }
        return true;
      })
      .slice(0, 4); // Take first 4 lines

    console.log(`✅ Parsed ${insights.length} insights`);

    // If AI didn't generate enough insights, return error
    if (insights.length < 2) {  // ✅ Changed from 0 to 2 (require at least 2 insights)
      console.error("❌ AI only generated", insights.length, "insight(s)");
      throw new Error(`AI generated only ${insights.length} insight(s), need 3-4`);
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
