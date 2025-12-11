// src/utils/moneyHelper.js

// 1. CHASE PARSER (Your existing logic)
const parseChaseStatement = (lines) => {
  const transactions = [];
  // Regex: 01 Jan 2023 ... Description ... Type ... Amount
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

// 2. MONZO PARSER (Example of a different layout)
const parseMonzoStatement = (lines) => {
  const transactions = [];
  // Regex: 2023-01-30 ... Description ... Amount
  // (Note: Monzo PDFs often look different, this is a generic example)
  const regex = /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([+-]?£?[\d,]+\.\d{2})/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const [_, date, desc, amountStr] = match;
      let cleanAmount = parseFloat(amountStr.replace(/[£,]/g, '').replace(/−|–|—/g, '-').trim());
      
      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: date, // Monzo dates are often already YYYY-MM-DD
        description: desc.trim(),
        amount: Math.abs(cleanAmount),
        type: cleanAmount < 0 ? 'expense' : 'income',
      });
    }
  }
  return transactions;
};

// 3. MAIN CONTROLLER (The Switch)
export const parseStatement = (rawText) => {
  // Clean text and split into lines
  let cleaned = rawText.replace(/\s+/g, ' ').replace(/(\d{1,2} [A-Za-z]{3} \d{4})/g, '\n$1').trim();
  const lines = cleaned.split('\n').filter(l => l.length > 20);

  // Detect Bank based on keywords in the full text
  if (rawText.includes('Chase') && rawText.includes('Account number')) {
    console.log("🏦 Detected: Chase Bank");
    const data = parseChaseStatement(lines);
    return data.map(addCategory); // Add categories at the end
  } 
  
  else if (rawText.includes('Monzo') || rawText.includes('monzo.com')) {
    console.log("🏦 Detected: Monzo");
    const data = parseMonzoStatement(lines);
    return data.map(addCategory);
  }

  else {
    alert("Bank not recognised! Currently supporting: Chase, Monzo.");
    return [];
  }
};

// 4. SHARED CATEGORISER (Your existing rules)
const addCategory = (t) => {
  t.category = categoriseTransaction(t.description);
  return t;
};

export const categoriseTransaction = (description) => {
  // ... Paste your existing categories list here ...
  const desc = description.toLowerCase();
  if (desc.includes('tesco') || desc.includes('sainsbury')) return 'Groceries';
  if (desc.includes('pret') || desc.includes('starbucks')) return 'Eating out';
  if (desc.includes('transport') || desc.includes('tfl')) return 'Transport';
  return 'Other';
};

// ... keep generateInsights export as well ...
export const generateInsights = (transactions) => { 
    // ... keep your existing insights code ...
    return [];
}
