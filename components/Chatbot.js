'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

export default function Chatbot({ transactions }) {
  // ✅ Set to true by default so chatbot is open on load
  const [isOpen, setIsOpen] = useState(true);
  // ✅ NEW: Track if this is the first time opening (for animation)
  const [hasAnimated, setHasAnimated] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I have analyzed your statement. Ask me anything about your spending!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // ✅ NEW: Trigger animation on mount
  useEffect(() => {
    if (isOpen && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isOpen, hasAnimated]);

  // ✅ Create a smart summary of transactions for the AI
  const transactionSummary = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    // Calculate totals by category
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    // Find top merchants
    const merchantTotals = {};
    expenses.forEach(t => {
      merchantTotals[t.description] = (merchantTotals[t.description] || 0) + t.amount;
    });

    // Get top 20 merchants
    const topMerchants = Object.entries(merchantTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([merchant, amount]) => `${merchant}: £${amount.toFixed(2)}`);

    // Get all coffee-related transactions
    const coffeeKeywords = ['coffee', 'cafe', 'pret', 'costa', 'starbucks', 'nero', 'greggs', 'caffe'];
    const coffeeTransactions = expenses.filter(t => 
      coffeeKeywords.some(keyword => t.description.toLowerCase().includes(keyword))
    );
    const coffeeTotal = coffeeTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Date range
    const dates = transactions.map(t => t.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    return {
      totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
      totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length,
      expenseCount: expenses.length,
      incomeCount: income.length,
      dateRange: `${startDate} to ${endDate}`,
      categoryBreakdown: categoryTotals,
      topMerchants: topMerchants,
      coffeeSpending: {
        total: coffeeTotal,
        count: coffeeTransactions.length,
        transactions: coffeeTransactions.slice(0, 10).map(t => `${t.date}: ${t.description} - £${t.amount.toFixed(2)}`)
      }
    };
  }, [transactions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          context: transactionSummary
        }),
      });

      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I couldn't reach the AI server. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* ✅ IMPROVED: Chat Window with Startup Animation */}
      {isOpen && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 sm:w-96 mb-4 pointer-events-auto flex flex-col overflow-hidden ${
          !hasAnimated 
            ? 'animate-[slideInBounce_0.6s_ease-out]' 
            : 'animate-in fade-in slide-in-from-bottom-10 duration-200'
        }`}>
          
          {/* ✅ CHANGED: Updated to "AI Accountant" */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="text-2xl">🤖</span>
                {/* ✅ NEW: Pulsing indicator */}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">AI Accountant</h3>
                <p className="text-xs text-blue-100">Online • Ready to help</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-blue-700/50 p-2 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 h-80 overflow-y-auto bg-slate-50 space-y-4">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${
                  i === 0 ? 'animate-[fadeInUp_0.4s_ease-out_0.3s_both]' : ''
                }`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-200 p-3 rounded-2xl rounded-bl-none text-slate-500 text-xs flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button 
              type="submit" 
              disabled={loading || !transactions.length}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-slate-700 text-white rotate-90' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
        }`}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* ✅ NEW: Custom Animation Styles */}
      <style jsx>{`
        @keyframes slideInBounce {
          0% {
            transform: translateY(100%) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateY(-10px) scale(1.02);
            opacity: 1;
          }
          80% {
            transform: translateY(5px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
