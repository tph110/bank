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

    // ✅ NEW: Calculate which categories are significant (>5% of spending or >£50)
    const significantCategories = topCategories
      .filter(([cat, amt]) => amt > 50 || (amt / totalSpent) * 100 > 5)
      .map(([cat, amt]) => {
        const percentage = ((amt / totalSpent) * 100).toFixed(0);
        return `${cat}: £${amt.toFixed(2)} (${percentage}%)`;
      });

    // ✅ NEW: Calculate potential savings only for high-spending categories
    const categoryAnalysis = topCategories
      .filter(([cat, amt]) => amt > 100)  // Only categories over £100
      .slice(0, 3)  // Top 3 only
      .map(([cat, amt]) => {
        const percentage = ((amt / totalSpent) * 100).toFixed(0);
        return `${cat}: £${amt.toFixed(2)} (${percentage}% of spending)`;
      })
      .join(', ');

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
- Be specific with numbers and percentages FROM THE DATA ONLY
- Be genuinely encouraging and enthusiastic for good financial behavior
- NEVER make up target amounts or suggest arbitrary savings goals
- NEVER suggest saving more if savings rate is already >50%
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
- Significant Spending Categories: ${significantCategories.join(', ') || 'None over £50'}
- High-Spending Categories (>£100): ${categoryAnalysis || 'None'}
- Largest Single Expense: £${largestExpense.amount.toFixed(2)} at ${largestExpense.description}
- Transaction Count: ${transactionCount}
- Average Transaction: £${avgTransactionSize}

UK BENCHMARKS FOR COMPARISON:
- UK average savings rate: 12-15%
- UK average coffee spending: £28/month
- UK average grocery spending: £175/month (single person), £400/month (family of 4)
- UK average eating out: £65/month
- UK average transport: £85/month

KEY PRINCIPLES FOR GENERATING INSIGHTS:
1. CELEBRATE HIGH SAVINGS RATES (>50%):
   - If savings rate >50%, NEVER suggest saving more
   - Focus on what they're doing RIGHT
   - Example: "Outstanding 87% savings rate - exceptional financial discipline!"

2. ONLY COMMENT ON SIGNIFICANT CATEGORIES:
   - Only mention categories that are >£100 or >10% of spending
   - Ignore small categories (e.g., £25/month business services is too small to mention)
   - Example: "Groceries at £245 is well below UK average of £400 for families"

3. BE SPECIFIC WITH COMPARISONS:
   - Compare actual amounts to UK benchmarks
   - Explain WHY something is good or bad
   - Example: "Coffee £31 matches UK average of £28 - well controlled"
   - NOT: "Consider reducing X by £Y" (unless there's clear reasoning)

4. IF TRANSFERS ARE HIGH (>£1000):
   - PRAISE this strongly
   - Example: "Transferred £7990 to savings - outstanding discipline!"
   - NOT: "Save £1500 more" (don't add arbitrary targets)

5. FOCUS ON PATTERNS, NOT ARBITRARY GOALS:
   - Comment on what's working well
   - For improvements, be specific: "Eating out £120 is above UK average £65"
   - NOT: "Reduce to £180" (no arbitrary targets)

6. AVOID ONE-OFF EXPENSES:
   - Don't comment on single large transactions unless clearly recurring
   - Focus on monthly recurring patterns

EXAMPLE GOOD INSIGHTS (for 87% savings rate, £245 groceries, £7990 transfers):
💰 Outstanding 87% savings rate - well above UK average of 15%!
📊 Transferred £7990 to savings - exceptional financial discipline!
🛒 Groceries at £245 is 39% below UK family average of £400 - excellent control!
☕ Coffee spending £31 matches UK average perfectly - well managed!

EXAMPLE BAD INSIGHTS (what NOT to do):
❌ "Consider reducing business services by £25/month to reach £180" (too specific, arbitrary target)
❌ "Save £1500 more!" (already saving 87%, unrealistic)
❌ "Reduce spending by 10%" (arbitrary percentage, no context)

Now generate 3-4 insights. Be encouraging, data-driven, and realistic. NO numbering, NO preamble.`
          },
          { role: "user", content: "Generate exactly 3-4 financial insights based strictly on the data provided. Be encouraging and specific." }
        ],
        temperature: 0.7,
        max_tokens: 400,
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
    console.log("📝 Raw AI output:", rawInsights);
    
    // Parse the AI response into array of insights
    const insights = rawInsights
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (line.length === 0) return false;
        if (line.length > 180) {
          console.log(`⚠️ Skipping long insight (${line.length} chars):`, line);
          return false;
        }
        return true;
      })
      .slice(0, 4);

    console.log(`✅ Parsed ${insights.length} insights`);

    // If AI didn't generate enough insights, return error
    if (insights.length < 2) {
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
