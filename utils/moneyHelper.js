// utils/moneyHelper.js

import { parseGenericStatement, calculateConfidence, validateTransactions } from './genericParser';
import { ParsingError, detectPDFIssues, analyzeParsingResults } from './errorMessages';

// Constants
const AVG_UK_COFFEE_SPEND = 28.50;
const AVG_UK_GROCERY_TRIP = 35;
const LOW_GROCERY_TRIP = 15;
const HIGH_SUBSCRIPTION_SPEND = 30;
const LARGE_EXPENSE_THRESHOLD = 50;
const MAX_PDF_PAGES = 50;

// ✅ Helper to detect year from statement header
const detectYear = (rawText) => {
  const currentYear = new Date().getFullYear();
  
  // Look for year in common statement header patterns (first 1500 characters)
  const header = rawText.substring(0, 1500);
  
  // Pattern 1: "January 2024" or "Jan 2024"
  const monthYearMatch = header.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(202[0-9])/i);
  if (monthYearMatch) {
    const year = parseInt(monthYearMatch[1]);
    console.log(`📅 Detected year from month pattern: ${year}`);
    return year;
  }
  
  // Pattern 2: "01/01/2024 to 31/01/2024" or similar date ranges
  const dateRangeMatch = header.match(/\d{1,2}\/\d{1,2}\/(202[0-9])/);
  if (dateRangeMatch) {
    const year = parseInt(dateRangeMatch[1]);
    console.log(`📅 Detected year from date range: ${year}`);
    return year;
  }
  
  // Pattern 3: "Statement period: 1 Jan 2024 - 31 Jan 2024"
  const periodMatch = header.match(/(?:Statement|Period|From).*?\b(202[0-9])\b/i);
  if (periodMatch) {
    const year = parseInt(periodMatch[1]);
    console.log(`📅 Detected year from statement period: ${year}`);
    return year;
  }
  
  // Pattern 4: Any 4-digit year (2020-2029) in header
  const yearMatch = header.match(/\b(202[0-9])\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    console.log(`📅 Detected year from header: ${year}`);
    return year;
  }
  
  console.log(`⚠️ No year detected in header, using current year: ${currentYear}`);
  return currentYear; // Fallback to current year
};

// ✅ Helper to detect bank type
const detectBankType = (rawText) => {
  const checks = [
    { keywords: ['Santander', 'Sort Code'], name: 'Santander' },
    { keywords: ['Chase', 'Account number'], name: 'Chase' },
    { keywords: ['Monzo', 'monzo.com'], name: 'Monzo' },
    { keywords: ['Lloyds', 'Halifax'], name: 'Lloyds/Halifax' },
  ];
  
  // Check standard banks (require all keywords)
  for (const check of checks) {
    if (check.keywords.every(kw => rawText.includes(kw))) {
      return check.name;
    }
  }
  
  // Barclays: Check for either personal or business accounts
  // Personal: Has "BARCLAYS" or "Barclays" in header
  // Business: Has "Your Business Current Account" or "Business Premium Account"
  if (rawText.includes('BARCLAYS') || 
      rawText.includes('Barclays') ||
      rawText.includes('Your Business Current Account') ||
      rawText.includes('Business Premium Account') ||
      rawText.includes('Business Savings Account')) {
    return 'Barclays';
  }
  
  return null;
};

// ✅ 1. PARSER FOR CHASE (Already includes year in transactions)
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

// ✅ 2. PARSER FOR MONZO (Already includes full date)
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

// ✅ 3. PARSER FOR SANTANDER (Uses detected year)
const parseSantanderStatement = (lines, detectedYear) => {
  const transactions = [];
  const regex = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})\s+(.*)\s+((?:\d{1,3},)*\d{1,3}\.\d{2})\s+[+-]?((?:\d{1,3},)*\d{1,3}\.\d{2})/;
  
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

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
        date: `${detectedYear}-${monthMap[monthAbbr]}-${day.padStart(2, '0')}`,
        description: description,
        amount: Math.abs(amount),
        type: isIncome ? 'income' : 'expense',
      });
    }
  }
  return transactions;
};

// ✅ 4. PARSER FOR BARCLAYS (Uses detected year)
const parseBarclaysStatement = (rawText, detectedYear) => {
  const transactions = [];
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

  const blob = rawText.replace(/\s+/g, ' ');

  let lastBalance = 0;
  const startBalMatch = blob.match(/(?:Start Balance|Balance brought forward)[^0-9]*?((?:\d{1,3},)*\d{1,3}\.\d{2})/i);
  if (startBalMatch) {
    lastBalance = parseFloat(startBalMatch[1].replace(/,/g, ''));
  }

  const regex = /((?:\d{1,3},)*\d{1,3}\.\d{2})\s+((?:\d{1,3},)*\d{1,3}\.\d{2})/g;
  
  let match;
  let lastIndex = 0;
  let currentDate = `${detectedYear}-01-01`;

  while ((match = regex.exec(blob)) !== null) {
    const amountStr = match[1];
    const balanceStr = match[2];
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const balance = parseFloat(balanceStr.replace(/,/g, ''));

    const diff = balance - lastBalance;
    const isValid = Math.abs(Math.abs(diff) - amount) < 0.05;

    if (isValid && amount > 0) {
      const isIncome = diff > 0;

      const lookbackStart = Math.max(lastIndex, match.index - 250);
      let descChunk = blob.substring(lookbackStart, match.index).trim();

      const dateMatch = descChunk.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);
      if (dateMatch) {
        const [_, dateStr] = dateMatch;
        const [day, monthAbbr] = dateStr.split(' ');
        const month = monthMap[monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1).toLowerCase()];
        currentDate = `${detectedYear}-${month}-${day.padStart(2, '0')}`;
        descChunk = descChunk.replace(dateStr, '').trim();
      }

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
        .replace(/Your Business Current Account/gi, '')
        .replace(/Business Premium Account/gi, '')
        .replace(/Business Savings Account/gi, '')
        .replace(/At a glance/gi, '')
        .replace(/THE PARTNERS/gi, '')
        .replace(/TRADING AS/gi, '')
        .replace(/SWIFTBIC [A-Z0-9]+/gi, '')
        .replace(/IBAN [A-Z0-9\s]+/gi, '')
        .replace(/Agreed limits/gi, '')
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

// ✅ 5. PARSER FOR LLOYDS / HALIFAX (Uses detected year)
const parseLloydsStatement = (lines, detectedYear) => {
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
      
      const twoDigitYear = dateParts[2];
      const fullYear = detectedYear.toString().substring(0, 2) + twoDigitYear;
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: `${fullYear}-${monthMap[dateParts[1]]}-${dateParts[0]}`,
        description: desc.trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income'
      });
    }
  }
  return transactions;
};

// ✅ 6. MASTER PARSER WITH GENERIC FALLBACK
export const parseStatement = (rawText, pageCount) => {
  console.log('🚀 Starting statement parsing...');
  
  // ✅ STEP 1: Check for PDF issues
  const pdfIssues = detectPDFIssues(rawText, pageCount);
  if (pdfIssues.length > 0) {
    const issue = pdfIssues[0]; // Report first critical issue
    throw new ParsingError(issue.type, issue.details);
  }
  
  if (pageCount > MAX_PDF_PAGES) {
    throw new ParsingError('PDF_TOO_LARGE', { pageCount, maxPages: MAX_PDF_PAGES });
  }
  
  if (!rawText || rawText.trim().length < 50) {
    throw new ParsingError('PDF_EMPTY', {});
  }

  // ✅ STEP 2: Detect year and bank type
  const detectedYear = detectYear(rawText);
  const detectedBank = detectBankType(rawText);
  
  console.log(`📊 Detected bank: ${detectedBank || 'Unknown'}, Year: ${detectedYear}`);

  let cleaned = rawText
    .replace(/\s+/g, ' ')
    .replace(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3}\s+(\d{4})?)/g, '\n$1') 
    .trim();
  
  const lines = cleaned.split('\n').filter(l => l.length > 20);
  let data = [];
  let parserUsed = '';
  let confidence = 0;

  // ✅ STEP 3: Try bank-specific parsers
  try {
    if (detectedBank === 'Santander') {
      data = parseSantanderStatement(lines, detectedYear);
      parserUsed = 'Santander';
    } 
    else if (detectedBank === 'Chase') {
      data = parseChaseStatement(lines);
      parserUsed = 'Chase';
    } 
    else if (detectedBank === 'Monzo') {
      data = parseMonzoStatement(lines);
      parserUsed = 'Monzo';
    }
    else if (detectedBank === 'Barclays') { 
      data = parseBarclaysStatement(rawText, detectedYear);
      parserUsed = 'Barclays';
    }
    else if (detectedBank === 'Lloyds/Halifax') {
      data = parseLloydsStatement(lines, detectedYear);
      parserUsed = 'Lloyds/Halifax';
    }
    
    // ✅ STEP 4: Validate bank-specific parser results
    if (data.length > 0) {
      data = validateTransactions(data);
      confidence = calculateConfidence(data);
      console.log(`✅ ${parserUsed} parser: ${data.length} transactions, confidence: ${(confidence * 100).toFixed(0)}%`);
    }
  } catch (error) {
    console.warn(`⚠️ ${parserUsed} parser failed:`, error.message);
    data = [];
  }

  // ✅ STEP 5: Try generic parser as fallback
  if (data.length === 0) {
    console.log('🔄 Bank-specific parser failed or not recognized, trying generic parser...');
    
    try {
      data = parseGenericStatement(rawText, detectedYear);
      parserUsed = 'Generic';
      
      if (data.length > 0) {
        data = validateTransactions(data);
        confidence = calculateConfidence(data);
        console.log(`✅ Generic parser: ${data.length} transactions, confidence: ${(confidence * 100).toFixed(0)}%`);
      }
    } catch (error) {
      console.error('❌ Generic parser also failed:', error.message);
    }
  }

  // ✅ STEP 6: Handle parsing failures
  if (data.length === 0) {
    if (detectedBank) {
      throw new ParsingError('NO_TRANSACTIONS_FOUND', { 
        bankType: detectedBank,
        textSample: rawText.substring(0, 200)
      });
    } else {
      // Try to detect if it might be an unsupported bank
      const potentialBankMatch = rawText.match(/(?:Bank|Building Society|Credit Union):\s*([A-Za-z\s&]+)/i);
      if (potentialBankMatch) {
        throw new ParsingError('UNSUPPORTED_BANK', { 
          bankName: potentialBankMatch[1].trim() 
        });
      }
      
      throw new ParsingError('BANK_NOT_RECOGNIZED', { 
        detectedText: rawText.substring(0, 200) 
      });
    }
  }

  // ✅ STEP 7: Check parsing quality
  if (confidence < 0.5) {
    throw new ParsingError('GENERIC_PARSER_FAILED', { 
      candidateLines: lines.length,
      transactionCount: data.length,
      confidence: confidence
    });
  }

  // ✅ STEP 8: Analyze results and generate warnings
  const warnings = analyzeParsingResults(data, parserUsed, confidence);
  if (warnings.length > 0) {
    console.warn('⚠️ Parsing warnings:', warnings);
    // Store warnings for display (you can add this to component state)
  }

  console.log(`✅ Successfully parsed ${data.length} transactions using ${parserUsed} parser (confidence: ${(confidence * 100).toFixed(0)}%)`);
  
  return data.map(t => ({
    ...t,
    category: categoriseTransaction(t.description, t.type),
    parserUsed, // Include which parser was used (useful for debugging)
    confidence: confidence // Include confidence score
  }));
};

// ✅ 7. CATEGORISATION (No changes needed)
export const categoriseTransaction = (description, type) => {
  const desc = description.toLowerCase().trim();
  
  if (type === 'income') {
    return 'Income';
  }
  
  const rules = [
    { keywords: ['british gas', 'edf', 'e.on', 'octopus', 'scottish power', 'bulb', 'shell energy', 'utilita', 'ovo', 'water', 'council tax', 'wod ct', 'ct dd', 'telecom', 'bt', 'sky', 'virgin media', 'talktalk', 'ee limited', 'ee ltd', 'vodafone', 'o2', 'three', 'plusnet', 'mobile'], category: 'Bills & Utilities' },
    { keywords: ['hmrc', 'tax', 'vat', 'national insurance'], category: 'Tax' },
    { keywords: ['admiral', 'aviva', 'direct line', 'hastings', 'churchill', 'axa', 'insurance', 'cover', 'protect', 'mddus', 'mdu', 'mps'], category: 'Insurance & Professional' },
    { keywords: ['stripe', 'gocardless', 'izettle', 'sumup', 'paypal', 'restore datashred', 'ico', 'companies house', 'xero', 'quickbooks', 'sage', 'iris payroll', 'iris business', 'aws', 'google cloud', 'slack', 'zoom', 'microsoft'], category: 'Business Services' },
    { keywords: ['tesco', 'sainsbury', 'aldi', 'waitrose', 'co-op', 'coop', 'ocado', 'asda', 'lidl', 'morrisons', 'm&s', 'iceland', 'farmfoods', 'whole foods'], category: 'Groceries' },
    { keywords: ['pret', 'costa', 'starbucks', 'greggs', 'mcdonald', 'burger king', 'nando', 'deliveroo', 'just eat', 'uber eats', 'cafe', 'coffee', 'kfc', 'subway', 'pizza', 'restaurant', ' bar ', 'pub', 'wetherspoon'], category: 'Eating out' },
    { keywords: ['amazon', 'amzn', 'argos', 'boots', 'superdrug', 'whsmith', 'next', 'zara', 'asos', 'temu', 'shein', 'ikea', 'primark', 'ebay', 'shopify', 'currys', 'john lewis', 'tk maxx', 'decathlon', 'sports direct'], category: 'Shopping' },
    { keywords: ['petrol station', 'petrol', 'fuel', 'shell', 'bp', 'esso', 'texaco', 'trainline', 'tfl', 'transport for london', 'uber', 'bolt', 'taxi', 'parking', 'garage', 'gwr', 'rail', 'train', 'ticket', 'stagecoach', 'arriva', 'first bus', 'go ahead'], category: 'Transport' },
    { keywords: ['pharmacy', 'dentist', 'gym', 'fitness', 'sport', 'puregym', 'doctor', 'medical', 'hospital', 'optician', 'boots opticians', 'specsavers', 'holland & barrett', 'aventis', 'boc', 'primary care'], category: 'Health & Wellbeing' },
    { keywords: ['netflix', 'spotify', 'disney', 'prime', 'apple', 'klarna', 'hbo', 'youtube', 'audible', 'playstation', 'xbox', 'nintendo', 'news'], category: 'Subscriptions' },
    { keywords: ['chase saver', 'rewards', 'transfer', 'savings', 'invest', 'trading 212', 'vanguard', 'hargreaves', 'moneybox', 'plum'], category: 'Transfers' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => desc.includes(kw))) return rule.category;
  }

  return 'Other';
};

// ✅ 8. AI-POWERED INSIGHTS (No changes needed)
export const generateInsights = async (transactions) => {
  const expenses = transactions.filter(t => 
    t.type === 'expense' && t.category !== 'Transfers'
  );
  const income = transactions.filter(t => t.type === 'income');
  const transfers = transactions.filter(t => t.category === 'Transfers');
  
  if (expenses.length === 0) return ['No expenses found in this period.'];

  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
  
  const categoryTotals = {};
  expenses.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const largest = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0 });

  const dates = transactions.map(t => t.date).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'Recent';

  try {
    console.log('🤖 Calling AI for insights...');
    
    const response = await fetch('/api/generate-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalSpent,
        totalIncome,
        topCategories,
        largestExpense: largest,
        transactionCount: expenses.length,
        dateRange,
        totalTransfers
      })
    });

    if (!response.ok) {
      throw new Error(`AI insights failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.insights && data.insights.length > 0) {
      console.log('✅ AI insights generated successfully');
      return data.insights;
    } else {
      throw new Error('No insights returned from AI');
    }
  } catch (error) {
    console.error('❌ AI insights failed, using fallback:', error.message);
    return getFallbackInsights(expenses, totalSpent, totalIncome, categoryTotals, largest, totalTransfers);
  }
};

const getFallbackInsights = (expenses, totalSpent, totalIncome, categoryTotals, largest, totalTransfers) => {
  const insights = [];
  
  if (totalTransfers > 0) {
    insights.push(`💰 You transferred £${totalTransfers.toFixed(2)} to savings this period.`);
  }
  
  const coffee = expenses
    .filter(t => /coffee|cafe|pret|costa|starbucks/i.test(t.description))
    .reduce((s, t) => s + t.amount, 0);
  if (coffee > 20) {
    insights.push(`☕ You spent £${coffee.toFixed(2)} on coffee this month.`);
  }

  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalSpent) / totalIncome * 100).toFixed(0);
    if (savingsRate > 0) {
      insights.push(`📊 You're saving ${savingsRate}% of your income (excluding transfers).`);
    }
  }

  if (largest.amount > 50) {
    insights.push(`⚠️ Largest expense: £${largest.amount.toFixed(2)} at ${largest.description}`);
  }

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    const percentage = (topCategory[1] / totalSpent * 100).toFixed(0);
    insights.push(`🎯 ${topCategory[0]} is ${percentage}% of your spending.`);
  }

  return insights.length > 0 ? insights : ['💡 Upload more transactions for better insights.'];
};
