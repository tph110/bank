'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { generateInsights } from '../utils/moneyHelper';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Dynamic Import (Prevents "DOMMatrix" Server Error)
const FileUploader = dynamic(() => import('../components/FileUploader'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
});

// Brand Colors for the Chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#82ca9d', '#a4de6c'];

// Categories for budget setting
const CATEGORIES = [
  'Groceries', 'Eating out', 'Transport', 'Shopping', 'Bills & Utilities',
  'Tax', 'Insurance & Professional', 'Business Services', 'Health & Wellbeing',
  'Subscriptions', 'Transfers', 'Other'
];

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);
  
  // Filter States
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  
  // Budget States
  const [budgets, setBudgets] = useState({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // View States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleDataParsed = (data) => {
    setTransactions(data);
    setInsights(generateInsights(data));
    
    // Load budgets from localStorage
    const savedBudgets = localStorage.getItem('categoryBudgets');
    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    }
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Category filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      
      // Date range filter
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      
      // Amount range filter
      if (filterAmountMin && t.amount < parseFloat(filterAmountMin)) return false;
      if (filterAmountMax && t.amount > parseFloat(filterAmountMax)) return false;
      
      return true;
    });
  }, [transactions, filterCategory, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  const totalSpent = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalSpent;

  // Month-over-Month Data
  const monthlyData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = {};
    
    expenses.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = 0;
      grouped[month] += t.amount;
    });
    
    return Object.entries(grouped)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  // Budget vs Actual Data
  const budgetData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const actualSpending = {};
    
    expenses.forEach(t => {
      actualSpending[t.category] = (actualSpending[t.category] || 0) + t.amount;
    });
    
    return CATEGORIES
      .filter(cat => budgets[cat] || actualSpending[cat])
      .map(cat => ({
        category: cat,
        budget: budgets[cat] || 0,
        actual: actualSpending[cat] || 0,
        remaining: (budgets[cat] || 0) - (actualSpending[cat] || 0)
      }));
  }, [filteredTransactions, budgets]);

  // Pie Chart Data
  const pieData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // CSV Download
  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.type,
      t.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `onlybanks_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Budget
  const saveBudget = (category, amount) => {
    const newBudgets = { ...budgets, [category]: parseFloat(amount) || 0 };
    setBudgets(newBudgets);
    localStorage.setItem('categoryBudgets', JSON.stringify(newBudgets));
  };

  // Clear Filters
  const clearFilters = () => {
    setFilterCategory('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/tph110/bank/refs/heads/main/logo2.png" 
              alt="OnlyBanks Logo" 
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Only<span className="text-blue-600">Banks</span>
            </h1>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8 sm:space-y-12">
        
        {/* Hero / Upload Section */}
        <section className="text-center space-y-4 sm:space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Financial clarity in seconds.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-4">
            A secure, AI-powered tool providing financial insights for individuals and businesses looking to maximise cashflow through detailed analytics.
          </p>
          
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-600 bg-white border border-slate-200 shadow-sm py-2 px-3 sm:px-4 rounded-full w-fit mx-auto mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">
              None of your personal information will leave your device. Only transaction data is extracted and analysed.
            </span>
          </div>

          <div className="mt-8">
            <FileUploader onDataParsed={handleDataParsed} />
          </div>
        </section>

        {transactions.length > 0 && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Filters Section - Mobile Optimized */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-slate-800">Filters</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBudgetModal(true)}
                    className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 px-3 sm:px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    💰 Set Budgets
                  </button>
                  <button 
                    onClick={clearFilters}
                    className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 px-3 sm:px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
                  <input 
                    type="date" 
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
                  <input 
                    type="date" 
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount Range</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={filterAmountMin}
                      onChange={(e) => setFilterAmountMin(e.target.value)}
                      className="w-1/2 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={filterAmountMax}
                      onChange={(e) => setFilterAmountMax(e.target.value)}
                      className="w-1/2 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filter Count */}
              {(filterCategory !== 'all' || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) && (
                <div className="mt-3 text-xs text-blue-600 font-medium">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </div>
              )}
            </div>

            {/* Summary Cards - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Income</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">£{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Spent</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">£{totalSpent.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-rose-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-3/4 rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Net Balance</p>
                <p className={`text-2xl sm:text-3xl font-bold ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {netBalance >= 0 ? '+' : ''}£{netBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {netBalance >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Tracking Section */}
            {budgetData.length > 0 && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Budget vs Actual</h3>
                <div className="space-y-3 sm:space-y-4">
                  {budgetData.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">{item.category}</span>
                        <div className="flex gap-2 sm:gap-4 text-xs">
                          <span className="text-slate-500">Budget: £{item.budget.toFixed(2)}</span>
                          <span className={item.actual > item.budget ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>
                            Spent: £{item.actual.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            item.actual > item.budget ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((item.actual / item.budget) * 100, 100)}%` }}
                        />
                      </div>
                      {item.remaining < 0 && (
                        <p className="text-xs text-rose-600 font-medium">⚠️ Over budget by £{Math.abs(item.remaining).toFixed(2)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Month-over-Month Comparison */}
            {monthlyData.length > 1 && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Spending Trend</h3>
                <div className="w-full h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                      <Bar dataKey="total" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Month-over-Month Insights */}
                {monthlyData.length >= 2 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      {(() => {
                        const latest = monthlyData[monthlyData.length - 1].total;
                        const previous = monthlyData[monthlyData.length - 2].total;
                        const change = ((latest - previous) / previous) * 100;
                        const isIncrease = change > 0;
                        
                        return (
                          <>
                            {isIncrease ? '📈' : '📉'} Spending {isIncrease ? 'increased' : 'decreased'} by {' '}
                            <span className="font-bold">{Math.abs(change).toFixed(1)}%</span> compared to last month
                          </>
                        );
                      })()}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Pie Chart Section - Mobile Optimized */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px] sm:min-h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 sm:mb-6">Spending Breakdown</h3>
                <div className="flex-1 w-full min-h-[250px] sm:min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Smart Insights */}
              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-indigo-600 text-white p-1.5 rounded-lg text-sm">💡</span>
                  <h3 className="text-lg font-bold text-indigo-900">AI Smart Insights</h3>
                </div>
                <ul className="space-y-3">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-3 text-indigo-800 text-sm font-medium bg-white/60 p-3 rounded-lg border border-indigo-50/50">
                      <span className="text-indigo-500 mt-0.5">•</span> {insight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Transaction Table - Mobile Optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                <h3 className="font-bold text-slate-700">Transactions ({filteredTransactions.length})</h3>
                <button 
                  onClick={downloadCSV}
                  className="w-full sm:w-auto text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 transition-colors px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  ⬇️ Download CSV
                </button>
              </div>
              
              {/* Mobile View - Card Layout */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm mb-1">{t.description}</p>
                        <p className="text-xs text-slate-500">{t.date}</p>
                      </div>
                      <p className={`text-base font-bold ml-2 ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {t.type === 'income' ? '+' : ''}£{t.amount.toFixed(2)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                      ${t.category === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        t.category === 'Other' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {t.category}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold tracking-wide">
                    <tr>
                      <th className="p-4 border-b border-slate-100">Date</th>
                      <th className="p-4 border-b border-slate-100 w-1/2">Description</th>
                      <th className="p-4 border-b border-slate-100">Category</th>
                      <th className="p-4 border-b border-slate-100 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-4 text-slate-500 text-sm whitespace-nowrap font-mono">{t.date}</td>
                        <td className="p-4 text-slate-800 text-sm font-medium truncate max-w-xs" title={t.description}>
                          {t.description}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${t.category === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              t.category === 'Other' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                              'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td className={`p-4 text-right text-sm font-mono font-bold 
                          ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {t.type === 'income' ? '+' : ''}£{t.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Set Category Budgets</h3>
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {CATEGORIES.map(category => (
                <div key={category} className="flex items-center gap-4">
                  <label className="flex-1 text-sm font-medium text-slate-700">{category}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">£</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={budgets[category] || ''}
                      onChange={(e) => saveBudget(category, e.target.value)}
                      className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setShowBudgetModal(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Save Budgets
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
