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

// ✅ 3. PARSER FOR SANTANDER (FINAL FIX)
const parseSantanderStatement = (lines) => {
  const transactions = [];
  // Regex: 27th Oct ... Description ... Amount
  // Changed (.*?) to (.*) to be "Greedy" -> Finds the LAST amount in the line (Fixes the 0.00 tax issue)
  const regex = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})\s+(.*)\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/;
  
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  
  // Use current year as fallback since lines usually lack year
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    // 🚫 SKIP HEADERS, FOOTERS, AND BALANCE LINES (Fixes phantom expenses)
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
      
      // ✅ IMPROVED INCOME DETECTION
      let isIncome = 
        upperDesc.includes('RECEIPT') || 
        upperDesc.includes('REFUND') || 
        upperDesc.includes('INTEREST PAID') ||
        upperDesc.includes('CASHBACK') || 
        description === 'transfer' || // "transfer" is usually money in for Santander
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

// ✅ 4. PARSER FOR LLOYDS / HALIFAX
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

// ✅ 5. MASTER PARSER
export const parseStatement = (rawText, pageCount) => {
  if (pageCount > MAX_PDF_PAGES) throw new Error(`PDF too large - max ${MAX_PDF_PAGES} pages.`);
  if (!rawText || rawText.trim().length < 50) throw new Error('PDF appears empty.');

  // Pre-process: Add newlines before dates to ensure splitting works
  // Handles "01 Jan 2023" (Chase) AND "01st Jan" (Santander)
  let cleaned = rawText
    .replace(/\s+/g, ' ')
    .replace(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3}\s+(\d{4})?)/g, '\n$1') 
    .trim();
  
  const lines = cleaned.split('\n').filter(l => l.length > 20);
  let data = [];
  let bankType = '';

  // 🔍 Improved Detection Logic
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
  else if (rawText.includes('Lloyds') || rawText.includes('Halifax')) {
    data = parseLloydsStatement(lines);
    bankType = 'Lloyds/Halifax';
  }
  else {
    throw new Error('Bank not recognised. Currently supporting: Chase, Monzo, Santander, Lloyds.');
  }

  if (data.length === 0) {
    throw new Error(`No transactions found in ${bankType} statement. Please check the file format.`);
  }

  console.log(`Parsed ${data.length} transactions from ${bankType}`);
  
  return data.map(t => ({
    ...t,
    category: categoriseTransaction(t.description)
  }));
};

// ✅ 6. CATEGORISATION
export const categoriseTransaction = (description) => {
  const desc = description.toLowerCase().trim();
  const rules = [
    { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s', 'iceland'], category: 'Groceries' },
    { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'deliveroo', 'just eat', 'uber eats', 'cafe', 'coffee', 'kfc', 'subway'], category: 'Eating out' },
    { keywords: ['amazon', 'argos', 'boots', 'superdrug', 'whsmith', 'next', 'zara', 'asos', 'temu', 'shein', 'ikea', 'primark'], category: 'Shopping' },
    { keywords: ['petrol', 'fuel', 'shell', 'bp', 'trainline', 'tfl', 'uber', 'bolt', 'taxi', 'bus', 'transport', 'parking'], category: 'Transport' },
    { keywords: ['pharmacy', 'dentist', 'gym', 'fitness', 'sport', 'puregym', 'doctor'], category: 'Health & Personal' },
    { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple', 'klarna', 'hbo', 'youtube'], category: 'Subscriptions' },
    { keywords: ['chase saver', 'rewards', 'transfer', 'savings', 'invest', 'trading 212'], category: 'Transfers' },
    { keywords: ['salary', 'wage', 'payroll', 'income', 'dividend', 'receipt', 'refund', 'cashback'], category: 'Income' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw))) return rule.category;
  }
  return 'Other';
};

// ✅ 7. INSIGHTS
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
