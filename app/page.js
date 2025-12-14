'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { generateInsights } from '../utils/moneyHelper';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);

  const handleDataParsed = (data) => {
    setTransactions(data);
    setInsights(generateInsights(data));
  };

  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalSpent;

  // 📊 Calculate Data for Pie Chart
  const pieData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort largest to smallest
  }, [transactions]);

  // ⬇️ CSV Download Function
  const downloadCSV = () => {
    if (transactions.length === 0) return;

    // 1. Create headers and rows
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.category,
      t.type,
      t.amount.toFixed(2)
    ]);

    // 2. Join them with commas and newlines
    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    // 3. Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `onlybanks_statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* 🟢 Header Section */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://raw.githubusercontent.com/tph110/bank/refs/heads/main/logo.png" 
              alt="OnlyBanks Logo" 
              className="h-16 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
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

      <div className="max-w-6xl mx-auto px-6 mt-12 space-y-12">
        
        {/* 🟢 Hero / Upload Section */}
        <section className="text-center space-y-6">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
             Financial clarity in seconds.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A secure, AI-powered tool providing financial insights for individuals and businesses looking to maximise cashflow through detailed analytics.
          </p>
          
          <div className="mt-10">
            <FileUploader onDataParsed={handleDataParsed} />
          </div>
        </section>

        {transactions.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 🟢 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Total Income</p>
                <p className="text-3xl font-bold text-slate-900">£{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Total Spent</p>
                <p className="text-3xl font-bold text-slate-900">£{totalSpent.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                <div className="mt-4 h-1 w-full bg-rose-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-3/4 rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Net Balance</p>
                <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {netBalance >= 0 ? '+' : ''}£{netBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {netBalance >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 🟢 Pie Chart Section */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Spending Breakdown</h3>
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 🟢 Smart Insights */}
              <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
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

            {/* 🟢 Transaction Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-700">Transactions ({transactions.length})</h3>
                <button 
                  onClick={downloadCSV}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  ⬇️ Download CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
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
                    {transactions.map((t) => (
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
    </main>
  );
}