// app/api/chat/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, transactions } = await request.json(); // ✅ Fixed!

    // Prepare context about the user's transactions
    const totalSpent = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categorySpending = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });

    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => `${category}: £${amount.toFixed(2)}`)
      .join(', ');

    // Date range
    const dates = transactions.map(t => t.date).sort();
    const dateRange = dates.length > 0 
      ? `${dates[0]} to ${dates[dates.length - 1]}` 
      : 'Unknown';

    // Build system prompt with financial context
    const systemPrompt = `You are a helpful AI accountant assistant analyzing the user's financial data. 

Financial Summary:
- Total Spent: £${totalSpent.toFixed(2)}
- Total Income: £${totalIncome.toFixed(2)}
- Net Balance: £${(totalIncome - totalSpent).toFixed(2)}
- Date Range: ${dateRange}
- Number of Transactions: ${transactions.length}
- Top Spending Categories: ${topCategories}

Provide helpful, concise financial advice. Focus on:
- Spending patterns and trends
- Savings opportunities
- Budget recommendations
- Category-specific insights

Be friendly, professional, and practical. Keep responses under 150 words unless asked for detail.`;

    // Call OpenRouter API (you can also use Anthropic API directly)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://onlybanks.vercel.app',
        'X-Title': 'OnlyBanks'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Or 'meta-llama/llama-3.2-3b-instruct:free'
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    return NextResponse.json({ 
      message: aiMessage,
      success: true 
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      error: 'Sorry, I encountered an error. Please try again.',
      success: false 
    }, { status: 500 });
  }
}
