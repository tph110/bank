// src/utils/moneyHelper.js

// Constants
const AVG_UK_COFFEE_SPEND = 28.50;
const AVG_UK_GROCERY_TRIP = 35;
const LOW_GROCERY_TRIP = 15;
const HIGH_SUBSCRIPTION_SPEND = 30;
const LARGE_EXPENSE_THRESHOLD = 50;
const MAX_PDF_PAGES = 50;

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

// ✅ 2. PARSER FOR MONZO
const parseMonzoStatement = (lines) => {
  const transactions = [];
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

// ✅ 3. PARSER FOR SANTANDER
const parseSantanderStatement = (lines) => {
  const transactions = [];
  const regex = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})\s+(.*)\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/;
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    if (line.includes('Balance brought forward') || 
        line.includes('Balance carried forward') || 
        line.includes('Start Balance') ||
        line.includes('Credit interest rate') || 
        line.includes('AER') || 
        line.includes('Average balance') ||
        line.includes('balance at close')) continue;

    const match = line.match(regex);
    if (match) {
      const [_, day, monthAbbr, desc, amountStr] = match;
      const description = desc.trim();
      const upperDesc = description.toUpperCase();
      
      let isIncome = 
        upperDesc.includes('RECEIPT') || 
        upperDesc.includes('REFUND') || 
        upperDesc.includes('INTEREST PAID') ||
        upperDesc.includes('CASHBACK') || 
        description === 'transfer' || 
        upperDesc.includes('PAYMENT FROM') ||
        upperDesc.includes('DEPOSIT');
      
      let amount = parseFloat(amountStr.replace(/,/g, ''));
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: `${currentYear}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`,
        description: description,
        amount: Math.abs(amount),
        type: isIncome ? 'income' : 'expense',
      });
    }
  }
  return transactions;
};

// ✅ 4. PARSER FOR BARCLAYS (NEW & ROBUST)
const parseBarclaysStatement = (rawText) => {
  const transactions = [];
  const currentYear = new Date().getFullYear();
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

  // 1. Find the "Start Balance" to help us calculate Income vs Expense mathematically
  let lastBalance = 0;
  const startBalanceMatch = rawText.match(/Start Balance\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/);
  if (startBalanceMatch) {
    lastBalance = parseFloat(startBalanceMatch[1].replace(/,/g, ''));
  } else {
    // Try "Balance brought forward" if Start Balance missing
    const bbfMatch = rawText.match(/Balance brought forward.*?\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/);
    if (bbfMatch) lastBalance = parseFloat(bbfMatch[1].replace(/,/g, ''));
  }

  // 2. Main Regex: Captures Date (optional), Description, Amount, Running Balance
  const regex = /(\d{1,2}\s[A-Za-z]{3})?\s+(.*?)\s+((?:\d{1,3},)*\d{1,3}\.\d{2})\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/g;
  
  let match;
  let lastDate = `${currentYear}-01-01`; // Fallback

  while ((match = regex.exec(rawText)) !== null) {
    const [_, dateStr, desc, amountStr, balanceStr] = match;
    const description = desc.trim();

    // Skip summary lines
    if (description.includes('Start Balance') || 
        description.includes('Balance brought forward') || 
        description.includes('Total Payments') ||
        description.includes('Balance carried forward')) continue;

    // Handle Date (Barclays lists date only once per day)
    if (dateStr) {
      const [day, monthAbbr] = dateStr.split(' ');
      lastDate = `${currentYear}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`;
    }

    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    // 3. MATHEMATICAL CHECK: Income or Expense?
    // If Balance INCREASED, it's Income. If DECREASED, it's Expense.
    let isIncome = false;
    const diff = balance - lastBalance;
    
    // Check if the difference matches the transaction amount (approximate for float errors)
    if (Math.abs(Math.abs(diff) - amount) < 0.05) {
      isIncome = diff > 0;
    } else {
      // Fallback to keywords if math fails (e.g. first transaction gap)
      const upperDesc = description.toUpperCase();
      isIncome = upperDesc.includes('CREDIT') || upperDesc.includes('DEPOSIT') || upperDesc.includes('RECEIPT');
    }

    // Update tracking balance
    lastBalance = balance;

    transactions.push({
      id: Math.random().toString(36).substr(2, 9),
      date: lastDate,
      description: description,
      amount: Math.abs(amount),
      type: isIncome ? 'income' : 'expense',
    });
  }

  return transactions;
};

// ✅ 5. PARSER FOR LLOYDS / HALIFAX
const parseLloydsStatement = (lines) => {
  const transactions = [];
  const regex = /(\d{2}\s[A-Za-z]{3}\s\d{2})\s+(.+?)\s+([+-]?£?[\d,]+\.\d{2})/;

  for (const line of lines) {
    if (line.includes('Balance carried forward') || line.includes('Money In')) continue;
    const match = line.match(regex);
    if (match) {
      const [_, dateStr, desc, amountStr] = match;
      const dateParts = dateStr.split(' '); 
      const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
      
      let cleanAmount = parseFloat(amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim());
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: `20${dateParts[2]}-${monthMap[dateParts[1]]}-${dateParts[0]}`,
        description: desc.trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income'
      });
    }
  }
  return transactions;
};

// ✅ 6. MASTER PARSER
export const parseStatement = (rawText, pageCount) => {
  if (pageCount > MAX_PDF_PAGES) throw new Error(`PDF too large - max ${MAX_PDF_PAGES} pages.`);
  if (!rawText || rawText.trim().length < 50) throw new Error('PDF appears empty.');

  let cleaned = rawText
    .replace(/\s+/g, ' ')
    .replace(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3}\s+(\d{4})?)/g, '\n$1') 
    .trim();
  
  const lines = cleaned.split('\n').filter(l => l.length > 20);
  let data = [];
  let bankType = '';

  if (rawText.includes('Santander') && rawText.includes('Sort Code')) {
    data = parseSantanderStatement(lines);
    bankType = 'Santander';
  } 
  else if (rawText.includes('Chase') && rawText.includes('Account number')) {
    data = parseChaseStatement(lines);
    bankType = 'Chase';
  } 
  else if (rawText.includes('Monzo') || rawText.includes('monzo.com')) {
    data = parseMonzoStatement(lines);
    bankType = 'Monzo';
  }
  else if (rawText.includes('BARCLAYS') || rawText.includes('Barclays')) { 
    // Pass RAW text for Barclays to handle multi-line regex better
    data = parseBarclaysStatement(rawText.replace(/\s+/g, ' '));
    bankType = 'Barclays';
  }
  else if (rawText.includes('Lloyds') || rawText.includes('Halifax')) {
    data = parseLloydsStatement(lines);
    bankType = 'Lloyds/Halifax';
  }
  else {
    throw new Error('Bank not recognised. Currently supporting: Chase, Monzo, Santander, Barclays, Lloyds.');
  }

  if (data.length === 0) {
    throw new Error(`No transactions found in ${bankType} statement.`);
  }

  console.log(`Parsed ${data.length} transactions from ${bankType}`);
  
  return data.map(t => ({
    ...t,
    category: categoriseTransaction(t.description)
  }));
};

// ✅ 7. CATEGORISATION
export const categoriseTransaction = (description) => {
  const desc = description.toLowerCase().trim();
  const rules = [
    { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s', 'iceland'], category: 'Groceries' },
    { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'deliveroo', 'just eat', 'uber eats', 'cafe', 'coffee', 'kfc', 'subway'], category: 'Eating out' },
    { keywords: ['amazon', 'argos', 'boots', 'superdrug', 'whsmith', 'next', 'zara', 'asos', 'temu', 'shein', 'ikea', 'primark'], category: 'Shopping' },
    { keywords: ['petrol', 'fuel', 'shell', 'bp', 'trainline', 'tfl', 'uber', 'bolt', 'taxi', 'bus', 'transport', 'parking'], category: 'Transport' },
    { keywords: ['pharmacy', 'dentist', 'gym', 'fitness', 'sport', 'puregym', 'doctor', 'medical'], category: 'Health & Personal' },
    { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple', 'klarna', 'hbo', 'youtube'], category: 'Subscriptions' },
    { keywords: ['chase saver', 'rewards', 'transfer', 'savings', 'invest', 'trading 212'], category: 'Transfers' },
    { keywords: ['salary', 'wage', 'payroll', 'income', 'dividend', 'receipt', 'refund', 'cashback', 'credit from'], category: 'Income' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw))) return rule.category;
  }
  return 'Other';
};

// ✅ 8. INSIGHTS
export const generateInsights = (transactions) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return ['No expenses found in this period.'];

  const insights = [];
  
  const coffee = expenses.filter(t => t.category === 'Eating out' && /coffee|cafe|pret|costa|starbucks/i.test(t.description)).reduce((s, t) => s + t.amount, 0);
  if (coffee > 20) insights.push(`☕ You spent £${coffee.toFixed(2)} on coffee this month.`);

  const largest = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0 });
  if (largest.amount > 50) insights.push(`⚠️ Largest expense: £${largest.amount.toFixed(2)} at ${largest.description}`);

  insights.push(`🛡️ Your UK deposits are protected by the FSCS up to £85,000.`);
  
  return insights;
};
