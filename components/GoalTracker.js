'use client';
import { useState, useEffect } from 'react';

export default function GoalTracker({ goals, onGoalsChange, transactions, currentSavingsRate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    category: 'General'
  });

  const activeGoals = goals.filter(g => {
    const progress = calculateProgress(g);
    return progress.status !== 'completed';
  });

  const completedGoals = goals.filter(g => {
    const progress = calculateProgress(g);
    return progress.status === 'completed';
  });

  function calculateProgress(goal) {
    const progressPercent = goal.targetAmount > 0 
      ? (goal.currentAmount / goal.targetAmount) * 100 
      : 0;

    const remaining = goal.targetAmount - goal.currentAmount;
    const today = new Date();
    const deadlineDate = new Date(goal.deadline);
    const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;
    const monthsRemaining = Math.max(1, daysRemaining / 30);
    const requiredMonthlySavings = remaining / monthsRemaining;

    let status = 'on-track';
    if (progressPercent >= 100) {
      status = 'completed';
    } else if (isOverdue) {
      status = 'overdue';
    } else if (daysRemaining < 30 && progressPercent < 80) {
      status = 'at-risk';
    }

    return {
      progressPercent: Math.min(100, progressPercent),
      remaining,
      daysRemaining: Math.abs(daysRemaining),
      isOverdue,
      monthsRemaining: Math.max(0, monthsRemaining),
      requiredMonthlySavings: Math.max(0, requiredMonthlySavings),
      status
    };
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const goalData = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount || 0)
    };

    if (editingGoal) {
      onGoalsChange('update', editingGoal.id, goalData);
    } else {
      onGoalsChange('create', goalData);
    }

    setShowModal(false);
    setEditingGoal(null);
    setFormData({ name: '', targetAmount: '', currentAmount: '0', deadline: '', category: 'General' });
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      category: goal.category
    });
    setShowModal(true);
  };

  const handleDelete = (goalId) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      onGoalsChange('delete', goalId);
    }
  };

  const handleUpdateProgress = (goalId, newAmount) => {
    onGoalsChange('update', goalId, { currentAmount: parseFloat(newAmount) });
  };

  if (goals.length === 0 && !isExpanded) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 sm:p-6 rounded-2xl border border-purple-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Set Your Financial Goals</h3>
              <p className="text-sm text-slate-600">Track progress toward savings targets</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            + New Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Financial Goals</h3>
              <p className="text-sm text-slate-500">
                {activeGoals.length} active • {completedGoals.length} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-xs sm:text-sm"
            >
              + New
            </button>
            <span className="text-slate-400 hover:text-blue-600 text-2xl font-light">
              {isExpanded ? '−' : '+'}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">Active Goals</h4>
                {activeGoals.map(goal => {
                  const progress = calculateProgress(goal);
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      progress={progress}
                      currentSavingsRate={currentSavingsRate}
                      onEdit={() => handleEdit(goal)}
                      onDelete={() => handleDelete(goal.id)}
                      onUpdateProgress={(amount) => handleUpdateProgress(goal.id, amount)}
                    />
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700">Completed 🎉</h4>
                {completedGoals.map(goal => {
                  const progress = calculateProgress(goal);
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      progress={progress}
                      currentSavingsRate={currentSavingsRate}
                      onEdit={() => handleEdit(goal)}
                      onDelete={() => handleDelete(goal.id)}
                      onUpdateProgress={(amount) => handleUpdateProgress(goal.id, amount)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Holiday Fund, Emergency Savings"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount (£)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="5000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                <input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Vacation">Vacation</option>
                  <option value="Emergency Fund">Emergency Fund</option>
                  <option value="Home">Home</option>
                  <option value="Education">Education</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Investment">Investment</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGoal(null);
                    setFormData({ name: '', targetAmount: '', currentAmount: '0', deadline: '', category: 'General' });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {editingGoal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function GoalCard({ goal, progress, currentSavingsRate, onEdit, onDelete, onUpdateProgress }) {
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'overdue': return 'bg-red-50 border-red-200';
      case 'at-risk': return 'bg-amber-50 border-amber-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const getStatusBadge = () => {
    switch (progress.status) {
      case 'completed': return <span className="text-xs bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-medium">✓ Completed</span>;
      case 'overdue': return <span className="text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded-full font-medium">Overdue</span>;
      case 'at-risk': return <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium">At Risk</span>;
      default: return <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-medium">On Track</span>;
    }
  };

  const handleQuickUpdate = (e) => {
    e.preventDefault();
    if (updateAmount) {
      onUpdateProgress(parseFloat(updateAmount));
      setShowQuickUpdate(false);
      setUpdateAmount('');
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-slate-900">{goal.name}</h4>
            {getStatusBadge()}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            <span className="capitalize">{goal.category}</span> • Deadline: {new Date(goal.deadline).toLocaleDateString('en-GB')}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 hover:bg-slate-200 rounded" title="Edit">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-200 rounded" title="Delete">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">£{goal.currentAmount.toFixed(2)}</span>
          <span className="font-bold">£{goal.targetAmount.toFixed(2)}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              progress.status === 'completed' ? 'bg-green-500' :
              progress.status === 'at-risk' ? 'bg-amber-500' :
              progress.status === 'overdue' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-slate-600 mt-1 text-center">
          {progress.progressPercent.toFixed(0)}% complete
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white/50 p-2 rounded">
          <div className="text-slate-600">Remaining</div>
          <div className="font-bold text-slate-900">£{progress.remaining.toFixed(2)}</div>
        </div>
        <div className="bg-white/50 p-2 rounded">
          <div className="text-slate-600">Days Left</div>
          <div className="font-bold text-slate-900">{progress.daysRemaining}</div>
        </div>
        <div className="bg-white/50 p-2 rounded">
          <div className="text-slate-600">Need/Month</div>
          <div className="font-bold text-slate-900">£{progress.requiredMonthlySavings.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Update */}
      {!showQuickUpdate ? (
        <button
          onClick={() => setShowQuickUpdate(true)}
          className="w-full mt-3 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors"
        >
          + Update Progress
        </button>
      ) : (
        <form onSubmit={handleQuickUpdate} className="mt-3 flex gap-2">
          <input
            type="number"
            step="0.01"
            value={updateAmount}
            onChange={(e) => setUpdateAmount(e.target.value)}
            placeholder="New amount"
            className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
            autoFocus
          />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
            Save
          </button>
          <button 
            type="button"
            onClick={() => {
              setShowQuickUpdate(false);
              setUpdateAmount('');
            }}
            className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs"
          >
            ✕
          </button>
        </form>
      )}

      {/* Insights */}
      {progress.status !== 'completed' && currentSavingsRate && currentSavingsRate.monthlySavings > 0 && (
        <div className="mt-2 text-xs text-slate-600 bg-white/50 p-2 rounded">
          {currentSavingsRate.monthlySavings >= progress.requiredMonthlySavings ? (
            <span className="text-green-700">✅ You're saving enough to reach this goal!</span>
          ) : (
            <span className="text-amber-700">
              ⚠️ Save £{(progress.requiredMonthlySavings - currentSavingsRate.monthlySavings).toFixed(2)} more/month to stay on track
            </span>
          )}
        </div>
      )}
    </div>
  );
}
