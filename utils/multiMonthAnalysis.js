// utils/multiMonthAnalysis.js

/**
 * Analyze multiple months of transaction data
 * Provides trends, comparisons, and insights
 */

/**
 * Group transactions by month
 */
export const groupByMonth = (transactions) => {
  const months = {};
  
  transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7); // YYYY-MM
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(t);
  });

  return months;
};

/**
 * Calculate monthly statistics
 */
export const calculateMonthlyStats = (transactions) => {
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Category breakdown
  const categorySpending = {};
  expenses.forEach(t => {
    categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
  });

  // Top categories
  const topCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    transactionCount: transactions.length,
    incomeCount: income.length,
    expenseCount: expenses.length,
    avgTransaction: expenses.length > 0 ? totalExpenses / expenses.length : 0,
    categorySpending,
    topCategories
  };
};

/**
 * Compare two months and generate insights
 */
export const compareMonths = (month1Stats, month2Stats, month1Key, month2Key) => {
  const insights = [];
  
  // Format month names
  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const month1Name = formatMonth(month1Key);
  const month2Name = formatMonth(month2Key);

  // Spending comparison
  const spendingChange = month2Stats.totalExpenses - month1Stats.totalExpenses;
  const spendingChangePercent = month1Stats.totalExpenses > 0 
    ? (spendingChange / month1Stats.totalExpenses) * 100 
    : 0;

  if (Math.abs(spendingChangePercent) > 5) {
    const direction = spendingChange > 0 ? 'increased' : 'decreased';
    const emoji = spendingChange > 0 ? '📈' : '📉';
    insights.push(
      `${emoji} Spending ${direction} by £${Math.abs(spendingChange).toFixed(2)} (${Math.abs(spendingChangePercent).toFixed(1)}%) from ${month1Name} to ${month2Name}`
    );
  } else {
    insights.push(`Spending remained stable between ${month1Name} and ${month2Name}`);
  }

  // Income comparison
  const incomeChange = month2Stats.totalIncome - month1Stats.totalIncome;
  if (Math.abs(incomeChange) > 100) {
    const direction = incomeChange > 0 ? 'increased' : 'decreased';
    insights.push(
      `Income ${direction} by £${Math.abs(incomeChange).toFixed(2)}`
    );
  }

  // Savings rate comparison
  const savingsRateChange = month2Stats.savingsRate - month1Stats.savingsRate;
  if (Math.abs(savingsRateChange) > 5) {
    const direction = savingsRateChange > 0 ? 'improved' : 'declined';
    const emoji = savingsRateChange > 0 ? '🎉' : '⚠️';
    insights.push(
      `${emoji} Savings rate ${direction} from ${month1Stats.savingsRate.toFixed(1)}% to ${month2Stats.savingsRate.toFixed(1)}%`
    );
  }

  // Category changes
  const significantCategoryChanges = [];
  const allCategories = new Set([
    ...Object.keys(month1Stats.categorySpending),
    ...Object.keys(month2Stats.categorySpending)
  ]);

  allCategories.forEach(category => {
    const prev = month1Stats.categorySpending[category] || 0;
    const curr = month2Stats.categorySpending[category] || 0;
    const change = curr - prev;
    const changePercent = prev > 0 ? (change / prev) * 100 : (curr > 0 ? 100 : 0);

    if (Math.abs(change) > 50 && Math.abs(changePercent) > 20) {
      significantCategoryChanges.push({
        category,
        change,
        changePercent,
        direction: change > 0 ? 'increased' : 'decreased'
      });
    }
  });

  // Report top category change
  if (significantCategoryChanges.length > 0) {
    significantCategoryChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const top = significantCategoryChanges[0];
    insights.push(
      `${top.category} ${top.direction} by £${Math.abs(top.change).toFixed(2)} (${Math.abs(top.changePercent).toFixed(0)}%)`
    );
  }

  return {
    insights,
    spendingChange,
    spendingChangePercent,
    incomeChange,
    savingsRateChange,
    categoryChanges: significantCategoryChanges
  };
};

/**
 * Analyze trends across all months
 */
export const analyzeTrends = (monthlyData) => {
  const sortedMonths = Object.keys(monthlyData).sort();
  
  if (sortedMonths.length < 2) {
    return {
      trend: 'insufficient-data',
      message: 'Upload more months to see trends'
    };
  }

  const stats = sortedMonths.map(month => ({
    month,
    ...calculateMonthlyStats(monthlyData[month])
  }));

  // Calculate overall trend
  const firstMonth = stats[0];
  const lastMonth = stats[stats.length - 1];
  
  const overallSpendingChange = lastMonth.totalExpenses - firstMonth.totalExpenses;
  const overallSpendingTrend = overallSpendingChange > 0 ? 'increasing' : 'decreasing';

  // Calculate average monthly spending
  const avgMonthlySpending = stats.reduce((sum, s) => sum + s.totalExpenses, 0) / stats.length;
  
  // Find best and worst months
  const bestMonth = stats.reduce((best, s) => 
    s.savingsRate > best.savingsRate ? s : best
  );
  
  const worstMonth = stats.reduce((worst, s) => 
    s.savingsRate < worst.savingsRate ? s : worst
  );

  // Consistency check
  const spendingValues = stats.map(s => s.totalExpenses);
  const avgSpending = spendingValues.reduce((sum, v) => sum + v, 0) / spendingValues.length;
  const variance = spendingValues.reduce((sum, v) => sum + Math.pow(v - avgSpending, 2), 0) / spendingValues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / avgSpending) * 100;
  const isConsistent = coefficientOfVariation < 20; // Less than 20% variation

  return {
    trend: overallSpendingTrend,
    overallSpendingChange,
    avgMonthlySpending,
    bestMonth,
    worstMonth,
    isConsistent,
    coefficientOfVariation,
    monthCount: stats.length,
    stats
  };
};

/**
 * Generate comprehensive multi-month insights
 */
export const generateMultiMonthInsights = (transactions) => {
  const monthlyData = groupByMonth(transactions);
  const trends = analyzeTrends(monthlyData);
  
  const insights = [];

  if (trends.trend === 'insufficient-data') {
    return [trends.message];
  }

  // Overall trend
  if (trends.overallSpendingChange > 100) {
    insights.push(
      `📊 Spending trend over ${trends.monthCount} months: ${trends.trend} by £${Math.abs(trends.overallSpendingChange).toFixed(2)}`
    );
  }

  // Best month
  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  insights.push(
    `🏆 Best month: ${formatMonth(trends.bestMonth.month)} with ${trends.bestMonth.savingsRate.toFixed(1)}% savings rate`
  );

  if (trends.worstMonth.month !== trends.bestMonth.month) {
    insights.push(
      `⚠️ Worst month: ${formatMonth(trends.worstMonth.month)} with ${trends.worstMonth.savingsRate.toFixed(1)}% savings rate`
    );
  }

  // Consistency
  if (trends.isConsistent) {
    insights.push(
      `✅ Your spending is consistent (avg £${trends.avgMonthlySpending.toFixed(2)}/month)`
    );
  } else {
    insights.push(
      `⚠️ Your spending varies significantly month-to-month - consider budgeting for consistency`
    );
  }

  // Recent trend (last 2 months)
  const sortedMonths = Object.keys(monthlyData).sort();
  if (sortedMonths.length >= 2) {
    const recentMonth1 = sortedMonths[sortedMonths.length - 2];
    const recentMonth2 = sortedMonths[sortedMonths.length - 1];
    const stats1 = calculateMonthlyStats(monthlyData[recentMonth1]);
    const stats2 = calculateMonthlyStats(monthlyData[recentMonth2]);
    
    const comparison = compareMonths(stats1, stats2, recentMonth1, recentMonth2);
    insights.push(...comparison.insights.slice(0, 2)); // Add top 2 recent insights
  }

  return insights;
};
