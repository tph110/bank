// utils/moneyHelper.js

// Constants
const AVG_UK_COFFEE_SPEND = 28.50;
const AVG_UK_GROCERY_TRIP = 35;
const LOW_GROCERY_TRIP = 15;
const HIGH_SUBSCRIPTION_SPEND = 30;
const LARGE_EXPENSE_THRESHOLD = 50;
const MAX_PDF_PAGES = 50;

// ✅ 1. IMPROVED PARSER FOR CHASE
const parseChaseStatement = (lines) => {
  const transactions = [];
  const regex = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(.*?)\s+(Purchase|Transfer|Refund|Payment)\s+([+-]£[\d,]*\.?\d+)\s+£[\d,]*\.?\d+/;
  const monthMap = { 
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', 
    May: '05', Jun: '06', Jul: '07', Aug: '08', 
    Sep: '09', Oct: '10', Nov: '11', Dec: '12' 
  };

  let successCount = 0;
  let failCount = 0;

  for (const line of lines) {
    // Skip header lines
    if (line.includes('Account number') || 
        line.includes('Opening balance') || 
        line.includes('Closing balance')) continue;
    
    const match = line.match(regex);
    if (!match) {
      failCount++;
      continue;
    }

    try {
      const [_, day, monthAbbr, year, brand, typeWord, amountStr] = match;
      
      // Validate date components
      if (!monthMap[monthAbbr] || !day || !year) {
        console.warn('Invalid date in line:', line);
        failCount++;
        continue;
      }

      const cleanAmount = parseFloat(
        amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim()
      );

      // Validate amount
      if (isNaN(cleanAmount) || cleanAmount === 0) {
        console.warn('Invalid amount in line:', line);
        failCount++;
        continue;
      }

      // Validate year (reasonable range)
      const yearNum = parseInt(year);
      if (yearNum < 2000 || yearNum > 2100) {
        console.warn('Invalid year in line:', line);
        failCount++;
        continue;
      }

      transactions.push({
        id: crypto.randomUUID(),
        date: `${year}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`,
        description: brand.split(' - ').pop().trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
      });
      successCount++;
    } catch (error) {
      console.error('Error parsing line:', line, error);
      failCount++;
    }
  }

  console.log(`Chase parsing: ${successCount} successful, ${failCount} failed`);
  return transactions;
};

// ✅ 2. IMPROVED PARSER FOR MONZO
const parseMonzoStatement = (lines) => {
  const transactions = [];
  // Basic Monzo Regex (YYYY-MM-DD ... Desc ... Amount)
  const regex = /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([+-]?£?[\d,]+\.\d{2})/;

  let successCount = 0;
  let failCount = 0;

  for (const line of lines) {
    const match = line.match(regex);
    if (!match) {
      failCount++;
      continue;
    }

    try {
      const [_, date, desc, amountStr] = match;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.warn('Invalid date format:', date);
        failCount++;
        continue;
      }

      const cleanAmount = parseFloat(
        amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim()
      );
      
      // Validate amount
      if (isNaN(cleanAmount) || cleanAmount === 0) {
        console.warn('Invalid amount in line:', line);
        failCount++;
        continue;
      }

      transactions.push({
        id: crypto.randomUUID(),
        date: date,
        description: desc.trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
      });
      successCount++;
    } catch (error) {
      console.error('Error parsing line:', line, error);
      failCount++;
    }
  }

  console.log(`Monzo parsing: ${successCount} successful, ${failCount} failed`);
  return transactions;
};

// ✅ 3. IMPROVED MAIN CONTROLLER
export const parseStatement = (rawText, pageCount) => {
  // Validate page count
  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`PDF too large - maximum ${MAX_PDF_PAGES} pages allowed`);
  }

  if (!rawText || rawText.trim().length < 50) {
    throw new Error('PDF appears to be empty or too short');
  }

  let cleaned = rawText
    .replace(/\s+/g, ' ')
    .replace(/(\d{1,2} [A-Za-z]{3} \d{4})/g, '\n$1')
    .trim();
  
  const lines = cleaned.split('\n').filter(l => l.length > 20);

  if (lines.length === 0) {
    throw new Error('No valid transaction lines found in PDF');
  }

  let data = [];
  let bankType = '';

  // Detect bank type
  if (rawText.includes('Chase') && rawText.includes('Account number')) {
    data = parseChaseStatement(lines);
    bankType = 'Chase';
  } else if (rawText.includes('Monzo') || rawText.includes('monzo.com')) {
    data = parseMonzoStatement(lines);
    bankType = 'Monzo';
  } else {
    throw new Error('Bank not recognised. Currently supporting: Chase, Monzo. Please upload a valid bank statement.');
  }

  if (data.length === 0) {
    throw new Error(`No transactions found in ${bankType} statement. Please check the file format.`);
  }

  console.log(`Successfully parsed ${data.length} transactions from ${bankType}`);

  // Apply categories to everything found
  return data.map(t => ({
    ...t,
    category: categoriseTransaction(t.description)
  }));
};

// ✅ 4. IMPROVED CATEGORISATION WITH FUZZY MATCHING
export const categoriseTransaction = (description) => {
  const desc = description.toLowerCase().trim();

  const rules = [
    { 
      keywords: ['tesco', 'sainsbury', 'sainsburys', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s', 'marks & spencer', 'iceland', 'farmfoods'], 
      category: 'Groceries' 
    },
    { 
      keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'mcdonalds', 'burger king', 'nando', 'nandos', 'domino', 'dominoes', 'deliveroo', 'just eat', 'justeat', 'ubereats', 'uber eats', 'cafe', 'coffee', 'kfc', 'subway', 'pizza hut'], 
      category: 'Eating out' 
    },
    { 
      keywords: ['amazon', 'argos', 'boots', 'superdrug', 'whsmith', 'w h smith', 'next', 'zara', 'asos', 'temu', 'shein', 'nyx', 'halfords', 'b&q', 'homebase', 'ikea', 'primark', 'h&m', 'tk maxx', 'tkmaxx'], 
      category: 'Shopping' 
    },
    { 
      keywords: ['petrol', 'fuel', 'shell', 'esso', 'bp', 'texaco', 'trainline', 'gwr', 'thameslink', 'uber', 'bolt', 'taxi', 'bus', 'tfl', 'transport', 'parking', 'oyster'], 
      category: 'Transport' 
    },
    { 
      keywords: ['pharmacy', 'chemist', 'dentist', 'dental', 'barber', 'hair', 'hairdresser', 'massage', 'gym', 'fitness', 'sport', 'puregym', 'david lloyd'], 
      category: 'Health & Personal' 
    },
    { 
      keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple.com/bill', 'apple music', 'klarna', 'box.co.uk', 'fraser retail', 'hbo', 'hulu', 'youtube premium'], 
      category: 'Subscriptions' 
    },
    { 
      keywords: ['chase saver', 'rewards', 'transfer', 'round-up', 'roundup', 'savings'], 
      category: 'Transfers' 
    },
    { 
      keywords: ['payment from', 'salary', 'wage', 'payroll', 'bacs payment', 'faster payment'], 
      category: 'Income' 
    },
  ];

  // Check exact matches first
  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw))) {
      return rule.category;
    }
  }

  // Additional category checks
  if (desc.includes('hotel') || desc.includes('airbnb') || desc.includes('booking') || desc.includes('expedia')) {
    return 'Travel';
  }
  
  if (desc.includes('bar') || desc.includes('pub') || desc.includes('club') || desc.includes('cocktail')) {
    return 'Nightlife';
  }

  if (desc.includes('cinema') || desc.includes('theatre') || desc.includes('concert') || desc.includes('ticket')) {
    return 'Entertainment';
  }

  return 'Other';
};

// ✅ 5. ENHANCED SMART INSIGHTS GENERATOR
export const generateInsights = (transactions) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return ['No expenses found in this period.'];

  const insights = [];
  const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0);

  // Coffee insights
  const coffeeTransactions = expenses.filter(t => 
    t.category === 'Eating out' && 
    /pret|costa|starbucks|coffee|cafe|greggs/i.test(t.description)
  );
  const coffeeSpend = coffeeTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  if (coffeeSpend > 0) {
    const ratio = Math.round(coffeeSpend / AVG_UK_COFFEE_SPEND * 10) / 10;
    if (ratio > 1) {
      insights.push(`☕ You spent £${coffeeSpend.toFixed(2)} on coffee this month — that's ${ratio}x the UK average!`);
    } else {
      insights.push(`☕ Coffee spending: £${coffeeSpend.toFixed(2)} — below the UK average of £${AVG_UK_COFFEE_SPEND}.`);
    }
  }

  // Grocery insights
  const groceryExpenses = expenses.filter(t => t.category === 'Groceries');
  const grocerySpend = groceryExpenses.reduce((sum, t) => sum + t.amount, 0);
  const groceryVisits = groceryExpenses.length;
  
  if (groceryVisits > 0) {
    const avgSpendPerTrip = grocerySpend / groceryVisits;
    if (avgSpendPerTrip > AVG_UK_GROCERY_TRIP) {
      insights.push(`🛒 Average grocery trip: £${avgSpendPerTrip.toFixed(2)} — try smaller, frequent shops to save money.`);
    } else if (avgSpendPerTrip < LOW_GROCERY_TRIP) {
      insights.push(`🛒 Excellent budgeting! Just £${avgSpendPerTrip.toFixed(2)} per grocery trip.`);
    }
  }

  // Subscription insights
  const subs = expenses.filter(t => t.category === 'Subscriptions');
  const subSpend = subs.reduce((sum, t) => sum + t.amount, 0);
  
  if (subSpend > HIGH_SUBSCRIPTION_SPEND) {
    insights.push(`📱 You spent £${subSpend.toFixed(2)} on subscriptions this month — worth reviewing unused ones?`);
  }

  // Eating out insights
  const eatingOut = expenses.filter(t => t.category === 'Eating out');
  const eatingOutSpend = eatingOut.reduce((sum, t) => sum + t.amount, 0);
  
  if (eatingOutSpend > 100) {
    const percentage = Math.round((eatingOutSpend / totalSpend) * 100);
    insights.push(`🍽️ Eating out: £${eatingOutSpend.toFixed(2)} (${percentage}% of total spending)`);
  }

  // Largest expense
  const largest = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0 });
  
  if (largest.amount > LARGE_EXPENSE_THRESHOLD) {
    insights.push(`⚠️ Largest single expense: £${largest.amount.toFixed(2)} at ${largest.description}`);
  }

  // Category breakdown (top 3)
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (topCategories.length > 0) {
    const [topCat, topAmount] = topCategories[0];
    const percentage = Math.round((topAmount / totalSpend) * 100);
    insights.push(`📊 Your top spending category: ${topCat} (${percentage}% - £${topAmount.toFixed(2)})`);
  }

  // FSCS protection reminder
  insights.push(`🛡️ Your UK bank deposits are protected by the FSCS up to £85,000.`);

  return insights;
};
