// src/utils/moneyHelper.js

// ✅ 1. PARSER FOR CHASE
const parseChaseStatement = (lines) => {
  const transactions = [];
  const regex = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.*?)\s+(Purchase|Transfer|Refund|Payment)\s+([+-]£[\d,]*\.?\d+)\s+£[\d,]*\.?\d+/;
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

  for (const line of lines) {
    if (line.includes('Account number') || line.includes('Opening balance')) continue;
    
    const match = line.match(regex);
    if (match) {
      const [_, day, monthAbbr, year, brand, typeWord, amountStr] = match;
      let cleanAmount = parseFloat(amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim());
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: `${year}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`,
        description: brand.split(' - ').pop().trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
      });
    }
  }
  return transactions;
};

// ✅ 2. PARSER FOR MONZO (Placeholder)
const parseMonzoStatement = (lines) => {
  const transactions = [];
  // Basic Monzo Regex (YYYY-MM-DD ... Desc ... Amount)
  const regex = /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([+-]?£?[\d,]+\.\d{2})/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const [_, date, desc, amountStr] = match;
      let cleanAmount = parseFloat(amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim());
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: date,
        description: desc.trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
      });
    }
  }
  return transactions;
};

// ✅ 3. MAIN CONTROLLER
export const parseStatement = (rawText) => {
  let cleaned = rawText.replace(/\s+/g, ' ').replace(/(\d{1,2} [A-Za-z]{3} \d{4})/g, '\n$1').trim();
  const lines = cleaned.split('\n').filter(l => l.length > 20);

  let data = [];

  if (rawText.includes('Chase') && rawText.includes('Account number')) {
    data = parseChaseStatement(lines);
  } else if (rawText.includes('Monzo') || rawText.includes('monzo.com')) {
    data = parseMonzoStatement(lines);
  } else {
    alert("Bank not recognised! Currently supporting: Chase, Monzo.");
    return [];
  }

  // Apply categories to everything found
  return data.map(t => ({
    ...t,
    category: categoriseTransaction(t.description)
  }));
};

// ✅ 4. FULL CATEGORISATION LOGIC (Restored!)
export const categoriseTransaction = (description) => {
  const desc = description.toLowerCase().trim();

  const rules = [
    { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s'], category: 'Groceries' },
    { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'domino', 'deliveroo', 'just eat', 'ubereats', 'cafe', 'coffee'], category: 'Eating out' },
    { keywords: ['amazon', 'argos', 'boots', 'superdrug', 'whsmith', 'next', 'zara', 'asos', 'temu', 'shein', 'nyx', 'halfords', 'b&q', 'homebase'], category: 'Shopping' },
    { keywords: ['petrol', 'fuel', 'shell', 'esso', 'bp', 'trainline', 'gwr', 'thameslink', 'uber', 'bolt', 'taxi', 'bus', 'tfl'], category: 'Transport' },
    { keywords: ['pharmacy', 'dentist', 'barber', 'hair', 'massage', 'gym', 'fitness', 'sport'], category: 'Health & Personal' },
    { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple.com/bill', 'klarna', 'box.co.uk', 'fraser retail', 'hbo', 'hulu'], category: 'Subscriptions' },
    { keywords: ['chase saver', 'rewards', 'transfer', 'round-up'], category: 'Transfers' },
    { keywords: ['payment from', 'salary', 'wage', 'payroll'], category: 'Income' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw))) {
      return rule.category;
    }
  }

  if (desc.includes('hotel') || desc.includes('airbnb') || desc.includes('booking')) return 'Travel';
  if (desc.includes('bar') || desc.includes('pub') || desc.includes('club')) return 'Nightlife';

  return 'Other';
};

// ✅ 5. SMART INSIGHTS GENERATOR
export const generateInsights = (transactions) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return [];

  const insights = [];

  // Coffee
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

  // Grocery
  const groceryExpenses = expenses.filter(t => t.category === 'Groceries');
  const grocerySpend = groceryExpenses.reduce((sum, t) => sum + t.amount, 0);
  const groceryVisits = groceryExpenses.length;
  if (groceryVisits > 0) {
    const avgSpendPerTrip = grocerySpend / groceryVisits;
    if (avgSpendPerTrip > 35) {
      insights.push(`🛒 Average grocery trip: £${avgSpendPerTrip.toFixed(2)} — try smaller, frequent shops.`);
    } else if (avgSpendPerTrip < 15) {
      insights.push(`🛒 Excellent budgeting! Just £${avgSpendPerTrip.toFixed(2)} per grocery trip.`);
    }
  }

  // Subscriptions
  const subs = expenses.filter(t => t.category === 'Subscriptions');
  const subSpend = subs.reduce((sum, t) => sum + t.amount, 0);
  if (subSpend > 30) {
    insights.push(`📱 You spent £${subSpend.toFixed(2)} on subscriptions — worth reviewing?`);
  }

  // Largest
  const largest = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0 });
  if (largest.amount > 50) {
    insights.push(`⚠️ Largest single expense: £${largest.amount.toFixed(2)} at ${largest.description}`);
  }

  insights.push(`🛡️ Your Chase UK deposits are protected by the FSCS up to £85,000.`);

  return insights;
};
