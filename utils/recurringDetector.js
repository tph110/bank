// utils/recurringDetector.js

/**
 * Detect recurring transactions (subscriptions, regular bills)
 * Looks for transactions with:
 * - Same merchant/description
 * - Similar amounts (within 10% variance)
 * - Regular intervals (weekly, monthly, yearly)
 */

const AMOUNT_VARIANCE_THRESHOLD = 0.10; // 10% variance allowed
const MIN_OCCURRENCES = 2; // Need at least 2 to be "recurring"

/**
 * Calculate days between two dates
 */
const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Normalize merchant name for matching
 * "NETFLIX UK" and "Netflix UK Ltd" should match
 */
const normalizeMerchant = (description) => {
  return description
    .toLowerCase()
    .replace(/ltd|limited|uk|plc|corp|inc/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2) // Take first 2 words
    .join(' ');
};

/**
 * Check if amounts are similar (within threshold)
 */
const amountsSimilar = (amount1, amount2) => {
  const avg = (amount1 + amount2) / 2;
  const diff = Math.abs(amount1 - amount2);
  return (diff / avg) <= AMOUNT_VARIANCE_THRESHOLD;
};

/**
 * Determine frequency from intervals (in days)
 */
const determineFrequency = (intervals) => {
  if (intervals.length === 0) return { type: 'unknown', days: 0 };
  
  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  
  // Weekly: 7 days ± 3 days
  if (avgInterval >= 4 && avgInterval <= 10) {
    return { type: 'weekly', days: 7, label: 'Weekly' };
  }
  
  // Fortnightly: 14 days ± 4 days
  if (avgInterval >= 10 && avgInterval <= 18) {
    return { type: 'fortnightly', days: 14, label: 'Every 2 weeks' };
  }
  
  // Monthly: 30 days ± 7 days
  if (avgInterval >= 23 && avgInterval <= 37) {
    return { type: 'monthly', days: 30, label: 'Monthly' };
  }
  
  // Quarterly: 90 days ± 15 days
  if (avgInterval >= 75 && avgInterval <= 105) {
    return { type: 'quarterly', days: 90, label: 'Quarterly' };
  }
  
  // Yearly: 365 days ± 30 days
  if (avgInterval >= 335 && avgInterval <= 395) {
    return { type: 'yearly', days: 365, label: 'Yearly' };
  }
  
  return { type: 'irregular', days: Math.round(avgInterval), label: `Every ${Math.round(avgInterval)} days` };
};

/**
 * Main function to detect recurring transactions
 */
export const detectRecurringTransactions = (transactions) => {
  // Group by normalized merchant name
  const merchantGroups = {};
  
  transactions.forEach(t => {
    if (t.type !== 'expense') return; // Only track recurring expenses
    
    const normalized = normalizeMerchant(t.description);
    if (!merchantGroups[normalized]) {
      merchantGroups[normalized] = [];
    }
    merchantGroups[normalized].push(t);
  });

  // Analyze each group for recurring patterns
  const recurring = [];

  Object.entries(merchantGroups).forEach(([normalizedName, txns]) => {
    if (txns.length < MIN_OCCURRENCES) return;

    // Sort by date
    txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check if amounts are similar
    const amounts = txns.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const allSimilar = amounts.every(a => amountsSimilar(a, avgAmount));

    if (!allSimilar) return; // Not recurring if amounts vary too much

    // Calculate intervals between transactions
    const intervals = [];
    for (let i = 1; i < txns.length; i++) {
      intervals.push(daysBetween(txns[i - 1].date, txns[i].date));
    }

    const frequency = determineFrequency(intervals);

    // Calculate days since last payment
    const lastTransaction = txns[txns.length - 1];
    const daysSinceLastPayment = daysBetween(lastTransaction.date, new Date().toISOString().split('T')[0]);

    // Predict next payment
    const nextPaymentDays = frequency.days - daysSinceLastPayment;
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + nextPaymentDays);

    // Calculate total spent
    const totalSpent = amounts.reduce((sum, a) => sum + a, 0);

    // Calculate annual cost
    const annualCost = frequency.days > 0 
      ? (avgAmount * 365) / frequency.days 
      : avgAmount * txns.length;

    recurring.push({
      merchant: txns[0].description, // Use original description
      normalizedName,
      frequency: frequency.label,
      frequencyDays: frequency.days,
      frequencyType: frequency.type,
      avgAmount,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      occurrences: txns.length,
      totalSpent,
      annualCost,
      lastPayment: lastTransaction.date,
      daysSinceLastPayment,
      nextPaymentDate: nextPaymentDays > 0 ? nextPaymentDate.toISOString().split('T')[0] : null,
      transactions: txns,
      category: txns[0].category,
      // Flag potentially unused subscriptions
      potentiallyUnused: daysSinceLastPayment > (frequency.days * 2) // Missed 2 cycles
    });
  });

  // Sort by annual cost (highest first)
  recurring.sort((a, b) => b.annualCost - a.annualCost);

  return recurring;
};

/**
 * Get summary statistics for recurring transactions
 */
export const getRecurringSummary = (recurringTransactions) => {
  const totalMonthly = recurringTransactions.reduce((sum, r) => {
    return sum + (r.avgAmount * 30) / r.frequencyDays;
  }, 0);

  const totalAnnual = recurringTransactions.reduce((sum, r) => sum + r.annualCost, 0);

  const byFrequency = recurringTransactions.reduce((acc, r) => {
    if (!acc[r.frequencyType]) {
      acc[r.frequencyType] = { count: 0, total: 0 };
    }
    acc[r.frequencyType].count++;
    acc[r.frequencyType].total += r.annualCost;
    return acc;
  }, {});

  const potentialSavings = recurringTransactions
    .filter(r => r.potentiallyUnused)
    .reduce((sum, r) => sum + r.annualCost, 0);

  return {
    count: recurringTransactions.length,
    totalMonthly,
    totalAnnual,
    byFrequency,
    potentialSavings,
    potentiallyUnusedCount: recurringTransactions.filter(r => r.potentiallyUnused).length
  };
};

/**
 * Generate insights about recurring transactions
 */
export const generateRecurringInsights = (recurringTransactions, summary) => {
  const insights = [];

  // Total spending insight
  if (summary.totalMonthly > 0) {
    insights.push(
      `You have ${summary.count} recurring payments totaling £${summary.totalMonthly.toFixed(2)}/month (£${summary.totalAnnual.toFixed(2)}/year)`
    );
  }

  // Potentially unused subscriptions
  if (summary.potentiallyUnusedCount > 0) {
    const unusedAmount = summary.potentialSavings;
    insights.push(
      `⚠️ ${summary.potentiallyUnusedCount} subscription${summary.potentiallyUnusedCount > 1 ? 's' : ''} may be unused - potential savings: £${unusedAmount.toFixed(2)}/year`
    );
  }

  // Top expense
  if (recurringTransactions.length > 0) {
    const top = recurringTransactions[0];
    insights.push(
      `Your biggest recurring expense is ${top.merchant} at £${top.avgAmount.toFixed(2)} ${top.frequency.toLowerCase()}`
    );
  }

  // Frequency breakdown
  const monthly = recurringTransactions.filter(r => r.frequencyType === 'monthly');
  if (monthly.length >= 5) {
    insights.push(
      `You have ${monthly.length} monthly subscriptions - consider annual plans for savings`
    );
  }

  return insights;
};
