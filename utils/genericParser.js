// utils/genericParser.js
// Generic fallback parser for bank statements that don't match known formats

/**
 * Attempts to extract transactions from any bank statement format
 * Uses adaptive pattern matching to find date + amount + description patterns
 */

const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

/**
 * Normalize a 2-digit or 4-digit year to YYYY format
 */
const normalizeYear = (yearStr, contextYear) => {
  const year = parseInt(yearStr);
  
  if (yearStr.length === 4) {
    return yearStr;
  }
  
  if (yearStr.length === 2) {
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    
    // Use context year if available
    if (contextYear) {
      const contextCentury = Math.floor(contextYear / 100) * 100;
      return (contextCentury + year).toString();
    }
    
    // Smart decade detection
    if (year >= 90) return (currentCentury - 100 + year).toString();
    return (currentCentury + year).toString();
  }
  
  return contextYear?.toString() || new Date().getFullYear().toString();
};

/**
 * Try to parse various date formats
 */
const extractDate = (text, contextYear) => {
  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyPattern = /(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})/;
  let match = text.match(dmyPattern);
  if (match) {
    const [_, day, month, year] = match;
    const normalizedYear = normalizeYear(year, contextYear);
    return `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Pattern 2: DD Mon YYYY or DD Month YYYY (e.g., "15 Jan 2024" or "15 January 2024")
  const dMonYPattern = /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/;
  match = text.match(dMonYPattern);
  if (match) {
    const [_, day, monthStr, year] = match;
    const month = MONTH_MAP[monthStr.toLowerCase()];
    if (month) {
      const normalizedYear = normalizeYear(year, contextYear);
      return `${normalizedYear}-${month}-${day.padStart(2, '0')}`;
    }
  }
  
  // Pattern 3: DD Mon (without year, e.g., "15 Jan")
  const dMonPattern = /(\d{1,2})\s+([A-Za-z]{3,9})(?!\s+\d)/;
  match = text.match(dMonPattern);
  if (match && contextYear) {
    const [_, day, monthStr] = match;
    const month = MONTH_MAP[monthStr.toLowerCase()];
    if (month) {
      return `${contextYear}-${month}-${day.padStart(2, '0')}`;
    }
  }
  
  // Pattern 4: YYYY-MM-DD (ISO format)
  const isoPattern = /(\d{4})-(\d{2})-(\d{2})/;
  match = text.match(isoPattern);
  if (match) {
    return match[0];
  }
  
  return null;
};

/**
 * Extract amount from text (handles various formats)
 */
const extractAmount = (text) => {
  // Pattern 1: £1,234.56 or £1234.56 or 1,234.56 or 1234.56
  const amountPattern = /[£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = [];
  let match;
  
  while ((match = amountPattern.exec(text)) !== null) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    
    // Valid transaction amounts (between £0.01 and £100,000)
    if (amount >= 0.01 && amount <= 100000) {
      matches.push({
        value: amount,
        position: match.index,
        text: match[0]
      });
    }
  }
  
  return matches;
};

/**
 * Determine if amount is income or expense based on context
 */
const determineTransactionType = (line, amount, balance) => {
  const lowerLine = line.toLowerCase();
  
  // Income indicators
  const incomeKeywords = [
    'salary', 'payment from', 'refund', 'cashback', 'interest paid',
    'credit', 'deposit', 'transfer in', 'receipt', 'incoming'
  ];
  
  // Expense indicators
  const expenseKeywords = [
    'payment to', 'purchase', 'withdrawal', 'debit', 'transfer out',
    'direct debit', 'standing order', 'card payment'
  ];
  
  // Check for explicit indicators
  if (incomeKeywords.some(kw => lowerLine.includes(kw))) {
    return 'income';
  }
  
  if (expenseKeywords.some(kw => lowerLine.includes(kw))) {
    return 'expense';
  }
  
  // Check for +/- symbols
  if (line.includes('+£') || line.includes('+ £')) {
    return 'income';
  }
  
  if (line.includes('-£') || line.includes('- £') || line.includes('−')) {
    return 'expense';
  }
  
  // Default to expense (most transactions are expenses)
  return 'expense';
};

/**
 * Extract description from line (remove date and amount)
 */
const extractDescription = (line, dateText, amountText) => {
  let description = line;
  
  // Remove date
  if (dateText) {
    description = description.replace(dateText, '');
  }
  
  // Remove amount
  if (amountText) {
    description = description.replace(amountText, '');
  }
  
  // Clean up
  description = description
    .replace(/^\s*[-•*]\s*/, '') // Remove bullet points
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^[^\w]+/, '') // Remove leading non-word chars
    .replace(/[^\w]+$/, '') // Remove trailing non-word chars
    .trim();
  
  return description;
};

/**
 * Validate that a transaction looks reasonable
 */
const isValidTransaction = (transaction) => {
  if (!transaction) return false;
  
  // Must have date in correct format
  if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    return false;
  }
  
  // Validate date is reasonable (between 2020 and current year + 1)
  const date = new Date(transaction.date);
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year < 2020 || year > currentYear + 1) {
    return false;
  }
  
  // Must have description
  if (!transaction.description || transaction.description.length < 2) {
    return false;
  }
  
  // Must have valid amount
  if (!transaction.amount || transaction.amount <= 0 || transaction.amount > 100000) {
    return false;
  }
  
  // Must have valid type
  if (!['income', 'expense'].includes(transaction.type)) {
    return false;
  }
  
  return true;
};

/**
 * Main generic parser function
 */
export const parseGenericStatement = (rawText, detectedYear) => {
  console.log('🔄 Attempting generic parser fallback...');
  
  const transactions = [];
  const lines = rawText.split('\n');
  
  // Filter to lines that look like they might be transactions
  const candidateLines = lines.filter(line => {
    // Must be reasonable length
    if (line.trim().length < 10) return false;
    
    // Skip obvious header/footer lines
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('page ') ||
      lowerLine.includes('statement') && lowerLine.includes('period') ||
      lowerLine.includes('sort code') ||
      lowerLine.includes('account number') ||
      lowerLine.includes('balance brought forward') ||
      lowerLine.includes('balance carried forward') ||
      lowerLine.includes('opening balance') ||
      lowerLine.includes('closing balance')
    ) {
      return false;
    }
    
    // Must have something that looks like a date
    const hasDate = /\d{1,2}[-\/\.\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})/i.test(line);
    
    // Must have something that looks like an amount
    const hasAmount = /[£]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/.test(line);
    
    return hasDate && hasAmount;
  });
  
  console.log(`📊 Found ${candidateLines.length} candidate transaction lines`);
  
  // Parse each candidate line
  for (const line of candidateLines) {
    try {
      const date = extractDate(line, detectedYear);
      if (!date) continue;
      
      const amounts = extractAmount(line);
      if (amounts.length === 0) continue;
      
      // Use the first valid amount found
      // (In more complex statements, you might need to choose between multiple amounts)
      const amount = amounts[0].value;
      const amountText = amounts[0].text;
      
      const type = determineTransactionType(line, amount, null);
      const description = extractDescription(line, date, amountText);
      
      if (!description || description.length < 2) continue;
      
      const transaction = {
        id: Math.random().toString(36).substr(2, 9),
        date,
        description,
        amount,
        type
      };
      
      // Only add if it passes validation
      if (isValidTransaction(transaction)) {
        transactions.push(transaction);
      }
    } catch (error) {
      // Skip lines that cause errors
      continue;
    }
  }
  
  console.log(`✅ Generic parser extracted ${transactions.length} valid transactions`);
  
  return transactions;
};

/**
 * Calculate confidence score for parsed transactions
 */
export const calculateConfidence = (transactions) => {
  if (transactions.length === 0) return 0;
  
  let score = 0;
  const checks = [];
  
  // Check 1: All dates are valid and in reasonable range
  const validDates = transactions.filter(t => {
    const date = new Date(t.date);
    const year = date.getFullYear();
    return year >= 2020 && year <= new Date().getFullYear() + 1;
  }).length;
  checks.push(validDates / transactions.length);
  
  // Check 2: Dates are in chronological order (or reverse chronological)
  const dates = transactions.map(t => new Date(t.date).getTime());
  const isAscending = dates.every((date, i) => i === 0 || date >= dates[i - 1]);
  const isDescending = dates.every((date, i) => i === 0 || date <= dates[i - 1]);
  checks.push(isAscending || isDescending ? 1 : 0.5);
  
  // Check 3: Descriptions are meaningful (not just numbers/symbols)
  const meaningfulDescriptions = transactions.filter(t => {
    const hasLetters = /[a-zA-Z]{3,}/.test(t.description);
    const notTooShort = t.description.length >= 3;
    return hasLetters && notTooShort;
  }).length;
  checks.push(meaningfulDescriptions / transactions.length);
  
  // Check 4: Amounts are reasonable (not all the same, not all tiny)
  const uniqueAmounts = new Set(transactions.map(t => t.amount)).size;
  const amountVariety = uniqueAmounts / transactions.length;
  checks.push(Math.min(amountVariety * 2, 1)); // Score 1.0 if 50%+ unique
  
  // Check 5: Mix of income and expenses (optional, scores 1.0 if not applicable)
  const hasIncome = transactions.some(t => t.type === 'income');
  const hasExpenses = transactions.some(t => t.type === 'expense');
  if (hasIncome && hasExpenses) {
    checks.push(1);
  } else if (hasIncome || hasExpenses) {
    checks.push(0.8); // OK to have only one type
  } else {
    checks.push(0);
  }
  
  // Average all checks
  score = checks.reduce((sum, check) => sum + check, 0) / checks.length;
  
  return score;
};

/**
 * Validate transaction array
 */
export const validateTransactions = (transactions) => {
  return transactions.filter(isValidTransaction);
};
