'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { generateInsights } from '../utils/moneyHelper';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';

// Dynamic Imports
const FileUploader = dynamic(() => import('../components/FileUploader'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
});

const Chatbot = dynamic(() => import('../components/Chatbot'), { 
  ssr: false 
});

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#82ca9d', '#a4de6c', '#d084d8', '#ff6b9d'];

const CATEGORIES = [
  'Groceries', 'Eating out', 'Transport', 'Shopping', 'Bills & Utilities',
  'Tax', 'Insurance & Professional', 'Business Services', 'Health & Wellbeing',
  'Subscriptions', 'Transfers', 'Other'
];

// ✅ Custom Active Shape for Interactive Pie Chart
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  
  return (
    <g>
      <text x={cx} y={cy - 15} dy={8} textAnchor="middle" fill={fill} className="font-bold text-xl">
        {payload.name}
      </text>
      <text x={cx} y={cy + 5} dy={8} textAnchor="middle" fill="#666" className="text-base font-semibold">
        £{value.toFixed(2)}
      </text>
      <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#999" className="text-sm">
        {((value / props.totalValue) * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [budgets, setBudgets] = useState({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // State for Interactive Pie Chart
  const [activeIndex, setActiveIndex] = useState(0);
  
  // State for Collapsible Sections
  const [isBudgetExpanded, setIsBudgetExpanded] = useState(false);
  const [isTrendExpanded, setIsTrendExpanded] = useState(false);

  // ✅ NEW: Function to update transaction category
  const updateTransactionCategory = (transactionId, newCategory) => {
    setTransactions(prevTransactions => 
      prevTransactions.map(t => 
        t.id === transactionId ? { ...t, category: newCategory } : t
      )
    );
  };

  const handleDataParsed = async (data) => {
    setTransactions(data);
    setInsightsLoading(true);
    
    // Generate AI insights (async)
    try {
      const aiInsights = await generateInsights(data);
      setInsights(aiInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights(['💡 Unable to generate insights. Please try again.']);
    } finally {
      setInsightsLoading(false);
    }
    
    const savedBudgets = localStorage.getItem('categoryBudgets');
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;
      if (filterAmountMin && t.amount < parseFloat(filterAmountMin)) return false;
      if (filterAmountMax && t.amount > parseFloat(filterAmountMax)) return false;
      return true;
    });
  }, [transactions, filterCategory, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  const totalSpent = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalSpent;

  const monthlyData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = {};
    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!grouped[month]) grouped[month] = 0;
      grouped[month] += t.amount;
    });
    return Object.entries(grouped)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const budgetData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const actualSpending = {};
    expenses.forEach(t => {
      actualSpending[t.category] = (actualSpending[t.category] || 0) + t.amount;
    });
    return CATEGORIES.filter(cat => budgets[cat] || actualSpending[cat]).map(cat => ({
      category: cat,
      budget: budgets[cat] || 0,
      actual: actualSpending[cat] || 0,
      remaining: (budgets[cat] || 0) - (actualSpending[cat] || 0)
    }));
  }, [filteredTransactions, budgets]);

  const pieData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const totalPieValue = useMemo(() => {
    return pieData.reduce((sum, entry) => sum + entry.value, 0);
  }, [pieData]);

  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = filteredTransactions.map(t => [t.date, `"${t.description.replace(/"/g, '""')}"`, t.category, t.type, t.amount.toFixed(2)]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `onlybanks_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveBudget = (category, amount) => {
    const newBudgets = { ...budgets, [category]: parseFloat(amount) || 0 };
    setBudgets(newBudgets);
    localStorage.setItem('categoryBudgets', JSON.stringify(newBudgets));
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://raw.githubusercontent.com/tph110/bank/refs/heads/main/logo2.png" alt="OnlyBanks Logo" className="h-16 sm:h-20 w-auto object-contain" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Only<span className="text-blue-600">Banks</span>
            </h1>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">Reset</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8 sm:space-y-12">
        <section className="text-center space-y-4 sm:space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Financial clarity in seconds.</h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-4">
            A secure, AI-powered tool providing financial insights for individuals and businesses looking to maximise cashflow through detailed analytics.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-600 bg-white border border-slate-200 shadow-sm py-2 px-3 sm:px-4 rounded-full w-fit mx-auto mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">No personal information will leave your device. Only transaction data is extracted and analysed.</span>
          </div>
          <div className="mt-8"><FileUploader onDataParsed={handleDataParsed} /></div>
        </section>

        {transactions.length > 0 && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Income</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">£{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-full rounded-full"></div></div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Spent</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">£{totalSpent.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-rose-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-3/4 rounded-full"></div></div>
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

            {/* Charts & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Pie Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px] sm:min-h-[450px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Spending Breakdown</h3>
                <div className="flex-1 w-full min-h-[280px] sm:min-h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        activeIndex={activeIndex}
                        activeShape={(props) => renderActiveShape({...props, totalValue: totalPieValue})}
                        data={pieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={98}
                        outerRadius={148}
                        fill="#8884d8" 
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            className="cursor-pointer transition-all duration-300 hover:opacity-80"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* AI Smart Insights */}
              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-indigo-600 text-white p-1.5 rounded-lg text-sm">🤖</span>
                  <h3 className="text-lg font-bold text-indigo-900">AI Smart Insights</h3>
                  {insightsLoading && (
                    <div className="ml-auto flex items-center gap-2 text-xs text-indigo-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                      <span>Analyzing...</span>
                    </div>
                  )}
                </div>
                
                {insightsLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-16 bg-indigo-100/60 rounded-lg"></div>
                    <div className="h-16 bg-indigo-100/60 rounded-lg"></div>
                    <div className="h-16 bg-indigo-100/60 rounded-lg"></div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {insights.map((insight, i) => (
                      <li 
                        key={i} 
                        className="flex items-start gap-3 text-indigo-800 text-sm font-medium bg-white/60 p-3 rounded-lg border border-indigo-50/50 animate-in fade-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <span className="text-indigo-500 mt-0.5">•</span> {insight}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-slate-800">Filters</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowBudgetModal(true)} className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 px-3 sm:px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">💰 Set Budgets</button>
                  <button onClick={clearFilters} className="flex-1 sm:flex-none text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 px-3 sm:px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select Category</option>
                    {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount Range</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} className="w-1/2 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="number" placeholder="Max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} className="w-1/2 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Section */}
            {budgetData.length > 0 && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsBudgetExpanded(!isBudgetExpanded)}>
                  <h3 className="text-lg font-bold text-slate-800">Budget vs Actual</h3>
                  <span className="text-slate-400 hover:text-blue-600 text-2xl font-light">{isBudgetExpanded ? '−' : '+'}</span>
                </div>
                {isBudgetExpanded && (
                  <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {budgetData.map((item) => {
                      const isOverBudget = item.budget > 0 && item.actual > item.budget;
                      const barColor = item.budget === 0 ? 'bg-blue-500' : (isOverBudget ? 'bg-rose-500' : 'bg-emerald-500');
                      const barWidth = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 100) : 100;
                      return (
                        <div key={item.category} className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-700">{item.category}</span>
                            <div className="flex gap-4 text-xs">
                              <span className="text-slate-500">Budget: £{item.budget.toFixed(2)}</span>
                              <span className={isOverBudget ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>Spent: £{item.actual.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Monthly Trend */}
            {monthlyData.length > 1 && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsTrendExpanded(!isTrendExpanded)}>
                  <h3 className="text-lg font-bold text-slate-800">Monthly Spending Trend</h3>
                  <span className="text-slate-400 hover:text-blue-600 text-2xl font-light">{isTrendExpanded ? '−' : '+'}</span>
                </div>
                {isTrendExpanded && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-full h-64 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `£${value}`} />
                          <Tooltip formatter={(value) => `£${value.toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={3} dot={{ r: 4, fill: '#0088FE', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                <h3 className="font-bold text-slate-700">Transactions ({filteredTransactions.length})</h3>
                <button onClick={downloadCSV} className="w-full sm:w-auto text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 transition-colors px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100">⬇️ Download CSV</button>
              </div>
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
                        <td className="p-4 text-slate-800 text-sm font-medium truncate max-w-xs">{t.description}</td>
                        <td className="p-4">
                          {/* ✅ EDITABLE CATEGORY DROPDOWN */}
                          <select 
                            value={t.category}
                            onChange={(e) => updateTransactionCategory(t.id, e.target.value)}
                            className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-colors cursor-pointer"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className={`p-4 text-right text-sm font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{t.type === 'income' ? '+' : ''}£{t.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ✅ MOBILE VIEW WITH EDITABLE CATEGORIES */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{t.description}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{t.date}</p>
                      </div>
                      <p className={`text-sm font-bold font-mono ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'income' ? '+' : ''}£{t.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Category:</label>
                      <select 
                        value={t.category}
                        onChange={(e) => updateTransactionCategory(t.id, e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
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
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <div className="space-y-4">
              {CATEGORIES.map(category => (
                <div key={category} className="flex items-center gap-4">
                  <label className="flex-1 text-sm font-medium text-slate-700">{category}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">£</span>
                    <input type="number" step="0.01" placeholder="0.00" defaultValue={budgets[category] || ''} onChange={(e) => saveBudget(category, e.target.value)} className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowBudgetModal(false)} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">Save Budgets</button>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      {transactions.length > 0 && <Chatbot transactions={transactions} />}
    </main>
  );
}
