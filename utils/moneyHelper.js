// src/utils/moneyHelper.js

export const categoriseTransaction = (description) => {
    const desc = description.toLowerCase().trim();
    
    // Your original rules logic
    const rules = [
      { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons'], category: 'Groceries' },
      { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'deliveroo', 'uber eats'], category: 'Eating out' },
      { keywords: ['amazon', 'argos', 'boots', 'superdrug', 'next', 'zara', 'asos', 'temu'], category: 'Shopping' },
      { keywords: ['petrol', 'fuel', 'shell', 'esso', 'bp', 'trainline', 'tfl', 'uber', 'bolt'], category: 'Transport' },
      { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple.com/bill'], category: 'Subscriptions' },
      { keywords: ['payment from', 'salary', 'wage'], category: 'Income' },
    ];
  
    for (const rule of rules) {
      if (rule.keywords.some(kw => desc.includes(kw))) return rule.category;
    }
    return 'Other';
  };
  
  export const parseChaseStatement = (text) => {
    let cleaned = text.replace(/\s+/g, ' ').replace(/(\d{1,2} [A-Za-z]{3} \d{4})/g, '\n$1').trim();
    const lines = cleaned.split('\n').filter(l => l.length > 25);
    const transactions = [];
    
    // Your regex pattern
    const transactionRegex = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.*?)\s+(Purchase|Transfer|Refund|Payment)\s+([+-]£[\d,]*\.?\d+)\s+£[\d,]*\.?\d+/;
    
    const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  
    for (const line of lines) {
      // Skip junk lines
      if (line.includes('Account number') || line.includes('Opening balance')) continue;
  
      const match = line.match(transactionRegex);
      // ... inside the for (const line of lines) loop ...

    if (match) {
      const [_, day, monthAbbr, year, brand, typeWord, amountStr] = match;
      
      let cleanAmount = parseFloat(amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim());
      
      transactions.push({
        // 🔴 DELETE THIS LINE: id: crypto.randomUUID(),
        // 🟢 ADD THIS LINE INSTEAD:
        id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        
        date: `${year}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`,
        description: brand.split(' - ').pop().trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
        category: categoriseTransaction(brand),
      });
    }
    }
    return transactions;
  };

  // ... existing code ...

// ✅ NEW: Generate Smart Insights
export const generateInsights = (transactions) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return [];

  const insights = [];

  // 1. Coffee Spend
  const coffeeTransactions = expenses.filter(t => 
    t.category === 'Eating out' && 
    /pret|costa|starbucks|coffee|cafe|greggs/i.test(t.description)
  );
  const coffeeSpend = coffeeTransactions.reduce((sum, t) => sum + t.amount, 0);
  if (coffeeSpend > 0) {
    const avgUK = 28.50;
    const ratio = Math.round(coffeeSpend / avgUK * 10) / 10;
    insights.push(`☕ You spent £${coffeeSpend.toFixed(2)} on coffee this month ${ratio > 1 ? `— that's ${ratio}x the UK average!` : '.'}`);
  }

  // 2. Grocery Efficiency
  const groceryExpenses = expenses.filter(t => t.category === 'Groceries');
  const grocerySpend = groceryExpenses.reduce((sum, t) => sum + t.amount, 0);
  const groceryVisits = groceryExpenses.length;
  if (groceryVisits > 0) {
    const avgSpendPerTrip = grocerySpend / groceryVisits;
    if (avgSpendPerTrip > 35) {
      insights.push(`🛒 Average grocery trip: £${avgSpendPerTrip.toFixed(2)} — try smaller, more frequent shops to reduce impulse buys.`);
    } else if (avgSpendPerTrip < 15) {
      insights.push(`🛒 Excellent budgeting! You spent just £${avgSpendPerTrip.toFixed(2)} per grocery trip.`);
    }
  }

  // 3. Subscriptions
  const subs = expenses.filter(t => t.category === 'Subscriptions');
  const subSpend = subs.reduce((sum, t) => sum + t.amount, 0);
  if (subSpend > 30) {
    insights.push(`📱 You spent £${subSpend.toFixed(2)} on subscriptions — worth reviewing unused ones?`);
  }

  // 4. Largest Spend
  const largest = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0 });
  if (largest.amount > 50) {
    insights.push(`⚠️ Largest single expense: £${largest.amount.toFixed(2)} at ${largest.description}`);
  }

  // 5. FSCS Protection (Static)
  insights.push(`🛡️ Your Chase UK deposits are protected by the FSCS up to £85,000.`);

  return insights;
};