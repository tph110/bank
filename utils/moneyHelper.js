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

  for (const line of lines) {
    if (line.includes('Account number') || line.includes('Opening balance')) continue;
    
    const match = line.match(regex);
    if (match) {
      const [_, day, monthAbbr, year, brand, typeWord, amountStr] = match;
      const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
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
  // Greedy match (.*) finds the LAST amount
  const regex = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})\s+(.*)\s+((?:\d{1,3},)*\d{1,3}\.\d{2})\s+[+-]?((?:\d{1,3},)*\d{1,3}\.\d{2})/;
  
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

// ✅ 4. PARSER FOR BARCLAYS (Polished)
const parseBarclaysStatement = (rawText) => {
  const transactions = [];
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const currentYear = new Date().getFullYear();

  // 1. Normalize text
  const blob = rawText.replace(/\s+/g, ' ');

  // 2. Find Start Balance
  let lastBalance = 0;
  const startBalMatch = blob.match(/(?:Start Balance|Balance brought forward)[^0-9]*?((?:\d{1,3},)*\d{1,3}\.\d{2})/i);
  if (startBalMatch) {
    lastBalance = parseFloat(startBalMatch[1].replace(/,/g, ''));
  }

  // 3. Regex to find "Amount Balance" pairs
  const regex = /((?:\d{1,3},)*\d{1,3}\.\d{2})\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/g;
  
  let match;
  let lastIndex = 0;
  let currentDate = `${currentYear}-01-01`;

  while ((match = regex.exec(blob)) !== null) {
    const amountStr = match[1];
    const balanceStr = match[2];
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    // 4. Mathematical Validation
    const diff = balance - lastBalance;
    const isValid = Math.abs(Math.abs(diff) - amount) < 0.05;

    if (isValid && amount > 0) {
      const isIncome = diff > 0;

      // Extract Description & Date
      // Look back ~250 chars
      const lookbackStart = Math.max(lastIndex, match.index - 250);
      let descChunk = blob.substring(lookbackStart, match.index).trim();

      // Find Date
      const dateMatch = descChunk.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);
      if (dateMatch) {
        const [_, dateStr] = dateMatch;
        const [day, monthAbbr] = dateStr.split(' ');
        const month = monthMap[monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1).toLowerCase()];
        currentDate = `${currentYear}-${month}-${day.padStart(2, '0')}`;
        // Remove date from description
        descChunk = descChunk.replace(dateStr, '').trim();
      }

      // 🧹 CLEANUP
      let cleanDesc = descChunk
        .replace(/Date Description/gi, '')
        .replace(/(?:Money out|ut) £ (?:Money in|in) £ (?:Balance|ance) £/gi, '') 
        .replace(/Start Balance/gi, '')
        .replace(/(?:Balance|ion) brought forward(?: from previous page)?(?: [\d,.]+\s*)?/gi, '')
        .replace(/Balance brought forward/gi, '')
        .replace(/\b\d{1,3}(?:,\d{3})+\.\d{2}\b/g, '')
        .replace(/(?:Sort Code|t Code|ode)\s*\d{2}-\d{2}-\d{2}(?:\s*•\s*\d+)?/gi, '')
        .replace(/\d{2}-\d{2}-\d{2}\s*•\s*\d+/gi, '')
        .replace(/Account No \d+/gi, '')
        .replace(/Page \d+/gi, '') 
        .replace(/\d+\s*•\s*\d+/g, '') 
        .replace(/.*Financial Services Compensation Scheme\.?/gi, '')
        .replace(/to "Barclays Base Rate".*? \d+/gi, '')
        .replace(/Banbury Road Medical Centre/gi, '') 
        .replace(/^\d{1,2}\s[A-Za-z]{3}/, '') 
        .replace(/Continued/gi, '')
        .replace(/^[^\w]+/, '') 
        .replace(/^\d+\s+/, '') 
        .trim();

      if (cleanDesc.length > 2) {
        transactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date: currentDate,
          description: cleanDesc,
          amount: Math.abs(amount),
          type: isIncome ? 'income' : 'expense',
        });
        
        lastBalance = balance;
      }
    }
    
    lastIndex = match.index + match[0].length;
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

  // Pre-process
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
    data = parseBarclaysStatement(rawText); 
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
    category: categoriseTransaction(t.description, t.type) // ✅ UPDATED: Pass t.type
  }));
};

// ✅ 7. CATEGORISATION (MASSIVELY UPGRADED) 
export const categoriseTransaction = (description, type) => { // ✅ UPDATED: Added 'type'
  const desc = description.toLowerCase().trim();
  
  // 1. Explicitly categorize actual income transactions
  if (type === 'income') {
    return 'Income';
  }
  
  // 2. EXPENSE RULES (Only run if it's not an income transaction)
  const rules = [
    // 1. BILLS & UTILITIES (New)
    { keywords: ['british gas', 'edf', 'e.on', 'octopus', 'scottish power', 'bulb', 'shell energy', 'utilita', 'ovo', 'water', 'council tax', 'wod ct', 'ct dd', 'telecom', 'bt', 'sky', 'virgin media', 'talktalk', 'ee limited', 'ee ltd', 'vodafone', 'o2', 'three', 'plusnet', 'mobile'], category: 'Bills & Utilities' },
    
    // 2. TAX & INSURANCE (New)
    { keywords: ['hmrc', 'tax', 'vat', 'national insurance'], category: 'Tax' },
    { keywords: ['admiral', 'aviva', 'direct line', 'hastings', 'churchill', 'axa', 'insurance', 'cover', 'protect', 'mddus', 'mdu', 'mps'], category: 'Insurance & Professional' },

    // 3. BUSINESS SERVICES (New)
    { keywords: ['stripe', 'gocardless', 'izettle', 'sumup', 'paypal', 'restore datashred', 'ico', 'companies house', 'xero', 'quickbooks', 'sage', 'iris payroll', 'iris business', 'aws', 'google cloud', 'slack', 'zoom', 'microsoft'], category: 'Business Services' },

    // 4. GROCERIES
    { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s', 'iceland', 'farmfoods', 'whole foods'], category: 'Groceries' },
    
    // 5. EATING OUT
    { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'deliveroo', 'just eat', 'uber eats', 'cafe', 'coffee', 'kfc', 'subway', 'pizza', 'restaurant', ' bar ', 'pub', 'wetherspoon'], category: 'Eating out' }, // ✅ FIX: Added spaces around ' bar '
    
    // 6. SHOPPING
    { keywords: ['amazon', 'amzn', 'argos', 'boots', 'superdrug', 'whsmith', 'next', 'zara', 'asos', 'temu', 'shein', 'ikea', 'primark', 'ebay', 'shopify', 'currys', 'john lewis', 'tk maxx', 'decathlon', 'sports direct'], category: 'Shopping' },
    
    // 7. TRANSPORT (UPDATED: "petrol station" added first for priority matching)
    { keywords: ['petrol station', 'petrol', 'fuel', 'shell', 'bp', 'esso', 'texaco', 'trainline', 'tfl', 'transport for london', 'uber', 'bolt', 'taxi', 'parking', 'garage', 'gwr', 'rail', 'train', 'ticket', 'stagecoach', 'arriva', 'first bus', 'go ahead'], category: 'Transport' },
    
    // 8. HEALTH & WELLBEING (Expanded)
    { keywords: ['pharmacy', 'dentist', 'gym', 'fitness', 'sport', 'puregym', 'doctor', 'medical', 'hospital', 'optician', 'boots opticians', 'specsavers', 'holland & barrett', 'aventis', 'boc', 'primary care'], category: 'Health & Wellbeing' },
    
    // 9. SUBSCRIPTIONS
    { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple', 'klarna', 'hbo', 'youtube', 'audible', 'playstation', 'xbox', 'nintendo', 'news'], category: 'Subscriptions' },
    
    // 10. TRANSFERS
    { keywords: ['chase saver', 'rewards', 'transfer', 'savings', 'invest', 'trading 212', 'vanguard', 'hargreaves', 'moneybox', 'plum'], category: 'Transfers' },
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
