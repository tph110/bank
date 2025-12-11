'use client';
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [transactions, setTransactions] = useState([]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">🏦 Chase Analyser</h1>
          <p className="text-gray-500">Secure, client-side bank statement processing</p>
        </header>

        {transactions.length === 0 ? (
          <FileUploader onDataLoaded={setTransactions} />
        ) : (
          <div>
            <button 
              onClick={() => setTransactions([])} 
              className="mb-4 text-sm text-blue-600 hover:underline"
            >
              ← Upload a different file
            </button>
            <Dashboard transactions={transactions} />
          </div>
        )}
      </div>
    </main>
  );
}