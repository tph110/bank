'use client';
import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { generateInsights } from '@/utils/moneyHelper'; // Import the new function

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard({ transactions }) {
  // Calculate totals
  const stats = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    const totalOut = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIn = income.reduce((sum, t) => sum + t.amount, 0);
    
    const byCategory = {};
    expenses.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    return { totalOut, totalIn, byCategory };
  }, [transactions]);

  // Generate Insights based on current data
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  // Chart Config
  const chartData = {
    labels: Object.keys(stats.byCategory),
    datasets: [{
      data: Object.values(stats.byCategory),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      borderWidth: 0,
    }],
  };

  // ✅ CSV Download Function
  const downloadCSV = () => {
    const header = 'Date,Description,Category,Amount,Type\n';
    const rows = transactions.map(t => 
      `"${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.amount}","${t.type}"`
    ).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chase_analysis.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm text-red-600">Total Spent</p>
          <p className="text-2xl font-bold text-red-700">£{stats.totalOut.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="text-sm text-green-600">Total Income</p>
          <p className="text-2xl font-bold text-green-700">£{stats.totalIn.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600">Net</p>
          <p className="text-2xl font-bold text-blue-700">
            £{(stats.totalIn - stats.totalOut).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Spending Breakdown</h3>
          <div className="w-full h-64">
            <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* ✅ NEW: Smart Insights Section */}
        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
          <h3 className="text-lg font-bold text-indigo-800 mb-4">💡 Smart Insights</h3>
          {insights.length > 0 ? (
            <ul className="space-y-3">
              {insights.map((insight, index) => (
                <li key={index} className="text-sm text-indigo-900 bg-white p-3 rounded shadow-sm border border-indigo-100">
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Not enough data for insights yet.</p>
          )}
        </div>
      </div>

      {/* Transaction List Header with Download Button */}
      <div className="flex justify-between items-end">
        <h3 className="text-xl font-bold text-gray-800">Transactions</h3>
        <button 
          onClick={downloadCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded shadow transition"
        >
          ⬇️ Download CSV
        </button>
      </div>
      
      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
                <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-500">{t.date}</td>
                        <td className="p-3 font-medium text-gray-800">{t.description}</td>
                        <td className="p-3">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                                {t.category}
                            </span>
                        </td>
                        <td className={`p-3 font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.type === 'expense' ? '-' : '+'}£{t.amount.toFixed(2)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}