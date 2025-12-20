// utils/excelExport.js
// Professional Excel export with multiple sheets, formatting, and charts

import * as XLSX from 'xlsx';

/**
 * Format date for Excel (DD/MM/YYYY)
 */
const formatDateForExcel = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Format currency for Excel
 */
const formatCurrency = (amount) => {
  return `£${amount.toFixed(2)}`;
};

/**
 * Generate Transactions sheet
 */
const generateTransactionsSheet = (transactions) => {
  // Create worksheet data
  const wsData = [
    // Header row with bold formatting
    ['Date', 'Description', 'Category', 'Type', 'Amount (£)']
  ];

  // Add transaction rows
  transactions.forEach(t => {
    wsData.push([
      formatDateForExcel(t.date),
      t.description,
      t.category,
      t.type === 'income' ? 'Income' : 'Expense',
      t.amount
    ]);
  });

  // Add totals row
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  wsData.push([]);
  wsData.push(['Total Income:', '', '', '', totalIncome]);
  wsData.push(['Total Expenses:', '', '', '', totalExpenses]);
  wsData.push(['Net Balance:', '', '', '', totalIncome - totalExpenses]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 },  // Date
    { wch: 40 },  // Description
    { wch: 20 },  // Category
    { wch: 10 },  // Type
    { wch: 12 }   // Amount
  ];

  // Apply formatting to header row (A1:E1)
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "2563EB" } }, // Blue-600
    alignment: { horizontal: "center", vertical: "center" }
  };

  // Apply formatting to total rows
  const totalRowStart = wsData.length - 2;
  for (let i = totalRowStart; i <= wsData.length; i++) {
    const cellRef = `E${i}`;
    if (ws[cellRef]) {
      ws[cellRef].z = '"£"#,##0.00'; // Currency format
    }
  }

  // Apply currency format to Amount column
  for (let i = 2; i <= transactions.length + 1; i++) {
    const cellRef = `E${i}`;
    if (ws[cellRef]) {
      ws[cellRef].z = '"£"#,##0.00';
    }
  }

  return ws;
};

/**
 * Generate Monthly Summary sheet
 */
const generateMonthlySummarySheet = (transactions) => {
  // Group by month
  const monthlyData = {};
  
  transactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0, transactions: 0 };
    }
    
    monthlyData[month].transactions++;
    if (t.type === 'income') {
      monthlyData[month].income += t.amount;
    } else {
      monthlyData[month].expenses += t.amount;
    }
  });

  // Convert to array and sort
  const sortedMonths = Object.keys(monthlyData).sort();

  // Create worksheet data
  const wsData = [
    ['Month', 'Income (£)', 'Expenses (£)', 'Net (£)', 'Transactions', 'Savings Rate (%)']
  ];

  sortedMonths.forEach(month => {
    const data = monthlyData[month];
    const net = data.income - data.expenses;
    const savingsRate = data.income > 0 ? ((net / data.income) * 100) : 0;
    
    // Format month as "Jan 2024"
    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' });
    
    wsData.push([
      `${monthName} ${year}`,
      data.income,
      data.expenses,
      net,
      data.transactions,
      savingsRate
    ]);
  });

  // Add summary row
  const totalIncome = Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0);
  const totalTransactions = Object.values(monthlyData).reduce((sum, m) => sum + m.transactions, 0);
  const overallSavingsRate = totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  wsData.push([]);
  wsData.push([
    'TOTAL',
    totalIncome,
    totalExpenses,
    totalIncome - totalExpenses,
    totalTransactions,
    overallSavingsRate
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 },  // Month
    { wch: 12 },  // Income
    { wch: 12 },  // Expenses
    { wch: 12 },  // Net
    { wch: 14 },  // Transactions
    { wch: 16 }   // Savings Rate
  ];

  // Apply currency formatting
  for (let i = 2; i <= wsData.length; i++) {
    ['B', 'C', 'D'].forEach(col => {
      const cellRef = `${col}${i}`;
      if (ws[cellRef]) {
        ws[cellRef].z = '"£"#,##0.00';
      }
    });
    
    // Percentage format for savings rate
    const cellRef = `F${i}`;
    if (ws[cellRef]) {
      ws[cellRef].z = '0.0"%"';
    }
  }

  return ws;
};

/**
 * Generate Category Breakdown sheet
 */
const generateCategoryBreakdownSheet = (transactions) => {
  // Group by category
  const categoryData = {};
  
  transactions.filter(t => t.type === 'expense').forEach(t => {
    if (!categoryData[t.category]) {
      categoryData[t.category] = { total: 0, count: 0 };
    }
    categoryData[t.category].total += t.amount;
    categoryData[t.category].count++;
  });

  // Sort by total (descending)
  const sortedCategories = Object.entries(categoryData)
    .sort((a, b) => b[1].total - a[1].total);

  const totalSpent = sortedCategories.reduce((sum, [_, data]) => sum + data.total, 0);

  // Create worksheet data
  const wsData = [
    ['Category', 'Total Spent (£)', 'Transactions', 'Average (£)', 'Percentage (%)']
  ];

  sortedCategories.forEach(([category, data]) => {
    const average = data.total / data.count;
    const percentage = (data.total / totalSpent) * 100;
    
    wsData.push([
      category,
      data.total,
      data.count,
      average,
      percentage
    ]);
  });

  // Add total row
  wsData.push([]);
  wsData.push([
    'TOTAL',
    totalSpent,
    sortedCategories.reduce((sum, [_, data]) => sum + data.count, 0),
    '',
    100
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 },  // Category
    { wch: 15 },  // Total Spent
    { wch: 14 },  // Transactions
    { wch: 12 },  // Average
    { wch: 15 }   // Percentage
  ];

  // Apply formatting
  for (let i = 2; i <= wsData.length; i++) {
    // Currency format
    ['B', 'D'].forEach(col => {
      const cellRef = `${col}${i}`;
      if (ws[cellRef]) {
        ws[cellRef].z = '"£"#,##0.00';
      }
    });
    
    // Percentage format
    const cellRef = `E${i}`;
    if (ws[cellRef]) {
      ws[cellRef].z = '0.0"%"';
    }
  }

  return ws;
};

/**
 * Generate Insights sheet
 */
const generateInsightsSheet = (transactions, insights) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');
  const transfers = transactions.filter(t => t.category === 'Transfers');
  
  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const totalTransfers = transfers.reduce((sum, t) => sum + t.amount, 0);
  
  const dates = transactions.map(t => t.date).sort();
  const dateRange = dates.length > 0 ? `${formatDateForExcel(dates[0])} to ${formatDateForExcel(dates[dates.length - 1])}` : 'N/A';

  // Find largest expense
  const largestExpense = expenses.reduce((max, t) => t.amount > max.amount ? t : max, { amount: 0, description: 'N/A' });

  // Calculate coffee spending
  const coffeeTransactions = expenses.filter(t => 
    /coffee|cafe|pret|costa|starbucks|nero|greggs/i.test(t.description)
  );
  const coffeeSpent = coffeeTransactions.reduce((sum, t) => sum + t.amount, 0);

  const wsData = [
    ['OnlyBanks Financial Insights'],
    [],
    ['Period:', dateRange],
    [],
    ['SUMMARY'],
    ['Total Income:', totalIncome],
    ['Total Spent:', totalSpent],
    ['Transfers to Savings:', totalTransfers],
    ['Net Balance:', totalIncome - totalSpent],
    ['Savings Rate:', totalIncome > 0 ? `${((totalIncome - totalSpent) / totalIncome * 100).toFixed(1)}%` : 'N/A'],
    [],
    ['SPENDING ANALYSIS'],
    ['Total Transactions:', transactions.length],
    ['Income Transactions:', income.length],
    ['Expense Transactions:', expenses.length],
    ['Average Transaction:', expenses.length > 0 ? totalSpent / expenses.length : 0],
    ['Largest Expense:', `${formatCurrency(largestExpense.amount)} at ${largestExpense.description}`],
    [],
    ['LIFESTYLE'],
    ['Coffee & Cafe Spending:', coffeeSpent],
    ['Coffee Purchases:', coffeeTransactions.length],
    [],
    ['AI-GENERATED INSIGHTS'],
  ];

  // Add AI insights
  insights.forEach(insight => {
    wsData.push([insight]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 },  // Label
    { wch: 50 }   // Value
  ];

  // Apply currency formatting
  const currencyRows = [6, 7, 8, 9, 16, 17, 20];
  currencyRows.forEach(row => {
    const cellRef = `B${row}`;
    if (ws[cellRef]) {
      ws[cellRef].z = '"£"#,##0.00';
    }
  });

  return ws;
};

/**
 * Generate Top Merchants sheet
 */
const generateTopMerchantsSheet = (transactions) => {
  const merchantData = {};
  
  transactions.filter(t => t.type === 'expense').forEach(t => {
    if (!merchantData[t.description]) {
      merchantData[t.description] = { total: 0, count: 0, lastDate: t.date };
    }
    merchantData[t.description].total += t.amount;
    merchantData[t.description].count++;
    if (t.date > merchantData[t.description].lastDate) {
      merchantData[t.description].lastDate = t.date;
    }
  });

  // Sort by total spent (descending) and take top 50
  const topMerchants = Object.entries(merchantData)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 50);

  const wsData = [
    ['Rank', 'Merchant', 'Total Spent (£)', 'Visits', 'Average (£)', 'Last Purchase']
  ];

  topMerchants.forEach(([merchant, data], index) => {
    wsData.push([
      index + 1,
      merchant,
      data.total,
      data.count,
      data.total / data.count,
      formatDateForExcel(data.lastDate)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },   // Rank
    { wch: 40 },  // Merchant
    { wch: 15 },  // Total Spent
    { wch: 8 },   // Visits
    { wch: 12 },  // Average
    { wch: 14 }   // Last Purchase
  ];

  // Apply currency formatting
  for (let i = 2; i <= wsData.length; i++) {
    ['C', 'E'].forEach(col => {
      const cellRef = `${col}${i}`;
      if (ws[cellRef]) {
        ws[cellRef].z = '"£"#,##0.00';
      }
    });
  }

  return ws;
};

/**
 * Main export function - generates Excel file with multiple sheets
 */
export const exportToExcel = (transactions, insights = []) => {
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  console.log('📊 Generating Excel export...');

  // Create new workbook
  const wb = XLSX.utils.book_new();

  // Generate all sheets
  const sheets = {
    'Transactions': generateTransactionsSheet(transactions),
    'Monthly Summary': generateMonthlySummarySheet(transactions),
    'Category Breakdown': generateCategoryBreakdownSheet(transactions),
    'Top Merchants': generateTopMerchantsSheet(transactions),
    'Insights': generateInsightsSheet(transactions, insights)
  };

  // Add sheets to workbook
  Object.entries(sheets).forEach(([name, sheet]) => {
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `OnlyBanks_Statement_${timestamp}.xlsx`;

  // Write file and trigger download
  XLSX.writeFile(wb, filename);

  console.log(`✅ Excel file exported: ${filename}`);
  
  return filename;
};

/**
 * Export only CSV (keep for backward compatibility)
 */
export const exportToCSV = (transactions) => {
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
  const rows = transactions.map(t => [
    formatDateForExcel(t.date),
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.type,
    t.amount.toFixed(2)
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `OnlyBanks_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
