'use client';
import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { generateInsights } from '@/utils/moneyHelper';

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

    return { totalOut, totalIn, byCategory, expenseCount: expenses.length, incomeCount: income.length };
  }, [transactions]);

  // Generate Insights based on current data
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  // Chart Config with accessibility improvements
  const chartData = {
    labels: Object.keys(stats.byCategory),
    datasets: [{
      data: Object.values(stats.byCategory),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = ((value / stats.totalOut) * 100).toFixed(1);
            return `${label}: £${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // ✅ CSV Download Function
  const downloadCSV = () => {
    try {
      const header = 'Date,Description,Category,Amount,Type\n';
      const rows = transactions.map(t => 
        `"${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.amount}","${t.type}"`
      ).join('\n');
      
      const csvContent = header + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = `bank_statement_analysis_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-100 shadow-sm">
          <p className="text-sm text-red-600 font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-red-700 mt-1" aria-label={`Total spent: ${formatCurrency(stats.totalOut)}`}>
            {formatCurrency(stats.totalOut)}
          </p>
          <p className="text-xs text-red-500 mt-1">{stats.expenseCount} transactions</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-100 shadow-sm">
          <p className="text-sm text-green-600 font-medium">Total Income</p>
          <p className="text-2xl font-bold text-green-700 mt-1" aria-label={`Total income: ${formatCurrency(stats.totalIn)}`}>
            {formatCurrency(stats.totalIn)}
          </p>
          <p className="text-xs text-green-500 mt-1">{stats.incomeCount} transactions</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
          <p className="text-sm text-blue-600 font-medium">Net Balance</p>
          <p 
            className={`text-2xl font-bold mt-1 ${
              stats.totalIn - stats.totalOut >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}
            aria-label={`Net balance: ${formatCurrency(stats.totalIn - stats.totalOut)}`}
          >
            {formatCurrency(stats.totalIn - stats.totalOut)}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            {stats.totalIn - stats.totalOut >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div 
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center"
          role="region"
          aria-label="Spending breakdown chart"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Spending Breakdown</h3>
          {Object.keys(stats.byCategory).length > 0 ? (
            <div className="w-full h-64">
              <Doughnut 
                data={chartData} 
                options={chartOptions}
                aria-label="Doughnut chart showing spending by category"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No expense data to display</p>
          )}
        </div>

        {/* Smart Insights Section */}
        <div 
          className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-100 shadow-sm"
          role="region"
          aria-label="Smart insights"
        >
          <h3 className="text-lg font-bold text-indigo-800 mb-4">💡 Smart Insights</h3>
          {insights.length > 0 ? (
            <ul className="space-y-3">
              {insights.map((insight, index) => (
                <li 
                  key={index} 
                  className="text-sm text-indigo-900 bg-white p-3 rounded shadow-sm border border-indigo-100"
                >
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
      <div className="flex justify-between items-center pt-4">
        <h3 className="text-xl font-bold text-gray-800">
          Transactions ({transactions.length})
        </h3>
        <button 
          onClick={downloadCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded shadow transition flex items-center gap-2"
          aria-label="Download transactions as CSV"
        >
          <span>⬇️</span>
          <span>Download CSV</span>
        </button>
      </div>
      
      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="p-3" scope="col">Date</th>
                <th className="p-3" scope="col">Description</th>
                <th className="p-3" scope="col">Category</th>
                <th className="p-3 text-right" scope="col">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-500 whitespace-nowrap">{t.date}</td>
                    <td className="p-3 font-medium text-gray-800">{t.description}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td 
                      className={`p-3 font-bold text-right whitespace-nowrap ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}
                      aria-label={`${t.type === 'expense' ? 'Expense' : 'Income'}: ${formatCurrency(t.amount)}`}
                    >
                      {t.type === 'expense' ? '-' : '+'}
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    No transactions to display
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
