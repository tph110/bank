'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function MultiMonthComparison({ trends, monthlyData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!trends || !trends.stats || trends.stats.length < 2) {
    return null;
  }

  // Prepare chart data
  const chartData = trends.stats.map(stat => {
    const [year, month] = stat.month.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

    return {
      month: monthName,
      spending: stat.totalExpenses,
      income: stat.totalIncome,
      savings: stat.netBalance,
      savingsRate: stat.savingsRate
    };
  });

  // Get trend emoji
  const getTrendEmoji = () => {
    if (trends.trend === 'decreasing') return '📉';
    if (trends.trend === 'increasing') return '📈';
    return '➡️';
  };

  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getTrendEmoji()}</span>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Multi-Month Analysis</h3>
            <p className="text-sm text-slate-500">
              {trends.monthCount} months • {trends.trend} trend
            </p>
          </div>
        </div>
        <span className="text-slate-400 hover:text-blue-600 text-2xl font-light">
          {isExpanded ? '−' : '+'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">Avg Spending</div>
              <div className="text-lg font-bold text-blue-900">£{trends.avgMonthlySpending.toFixed(2)}</div>
              <div className="text-xs text-blue-600 mt-1">per month</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-600 font-medium">Best Month</div>
              <div className="text-sm font-bold text-green-900 mt-1">
                {formatMonth(trends.bestMonth.month).split(' ')[0]}
              </div>
              <div className="text-xs text-green-600">{trends.bestMonth.savingsRate.toFixed(1)}% saved</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <div className="text-xs text-amber-600 font-medium">Worst Month</div>
              <div className="text-sm font-bold text-amber-900 mt-1">
                {formatMonth(trends.worstMonth.month).split(' ')[0]}
              </div>
              <div className="text-xs text-amber-600">{trends.worstMonth.savingsRate.toFixed(1)}% saved</div>
            </div>
            <div className={`${trends.isConsistent ? 'bg-green-50' : 'bg-amber-50'} p-3 rounded-lg`}>
              <div className={`text-xs ${trends.isConsistent ? 'text-green-600' : 'text-amber-600'} font-medium`}>
                Consistency
              </div>
              <div className={`text-lg font-bold ${trends.isConsistent ? 'text-green-900' : 'text-amber-900'}`}>
                {trends.isConsistent ? '✅' : '⚠️'}
              </div>
              <div className={`text-xs ${trends.isConsistent ? 'text-green-600' : 'text-amber-600'}`}>
                {trends.isConsistent ? 'Stable' : 'Variable'}
              </div>
            </div>
          </div>

          {/* Spending Trend Chart */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-slate-700 mb-4">Monthly Spending Trend</h4>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `£${value}`} />
                  <Tooltip 
                    formatter={(value) => `£${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} name="Spending" />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Income" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Savings Rate Chart */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-slate-700 mb-4">Savings Rate by Month</h4>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)}%`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="savingsRate" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Savings Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Month Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs font-semibold">
                <tr>
                  <th className="p-3 rounded-tl-lg">Month</th>
                  <th className="p-3 text-right">Income</th>
                  <th className="p-3 text-right">Spending</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-right rounded-tr-lg">Savings %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trends.stats.map((stat, index) => (
                  <tr key={stat.month} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">
                      {formatMonth(stat.month)}
                    </td>
                    <td className="p-3 text-right text-green-600 font-medium">
                      £{stat.totalIncome.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-red-600 font-medium">
                      £{stat.totalExpenses.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold">
                      <span className={stat.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {stat.netBalance >= 0 ? '+' : ''}£{stat.netBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stat.savingsRate >= 20 ? 'bg-green-100 text-green-800' :
                        stat.savingsRate >= 10 ? 'bg-blue-100 text-blue-800' :
                        stat.savingsRate >= 0 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {stat.savingsRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
