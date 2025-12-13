'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { generateInsights } from '../utils/moneyHelper';

// ✅ Dynamic Import (Prevents "DOMMatrix" Server Error)
const FileUploader = dynamic(() => import('../components/FileUploader'), {
  ssr: false,
  loading: () => <p className="text-center p-4">Loading uploader...</p>
});

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState([]);

  // ✅ THIS is the function the Uploader is looking for!
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

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-2">
            Bank Statement Analyser
          </h1>
          <p className="text-lg text-gray-600">
            Upload your PDF → Get smart spend insights (AI Powered)
          </p>
        </header>

        {/* ✅ PASS THE FUNCTION HERE */}
        <FileUploader onDataParsed={handleDataParsed} />

        {transactions.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                <p className="text-sm text-gray-500 uppercase font-bold">Total Spent</p>
                <p className="text-3xl font-bold text-gray-900">£{totalSpent.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-sm text-gray-500 uppercase font-bold">Total Income</p>
                <p className="text-3xl font-bold text-gray-900">£{totalIncome.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-sm text-gray-500 uppercase font-bold">Net Balance</p>
                <p className={`text-3xl font-bold ${totalIncome - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  £{(totalIncome - totalSpent).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <h3 className="text-xl font-bold text-indigo-900 mb-4">💡 Smart Insights</h3>
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-indigo-800">
                    <span>•</span> {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-600 whitespace-nowrap">{t.date}</td>
                      <td className="p-4 font-medium text-gray-900">{t.description}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${t.category === 'Income' ? 'bg-green-100 text-green-700' : 
                            t.category === 'Other' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-blue-100 text-blue-700'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}£{t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}