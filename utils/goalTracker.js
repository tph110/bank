// utils/goalTracker.js

/**
 * Goal Tracking System
 * Allows users to set financial goals and track progress
 */

const GOAL_STORAGE_KEY = 'onlybanks_goals';

/**
 * Goal structure:
 * {
 *   id: string,
 *   name: string,
 *   targetAmount: number,
 *   currentAmount: number,
 *   deadline: string (YYYY-MM-DD),
 *   category: string,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

/**
 * Get all goals from localStorage
 */
export const getGoals = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading goals:', error);
    return [];
  }
};

/**
 * Save goals to localStorage
 */
export const saveGoals = (goals) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving goals:', error);
  }
};

/**
 * Create a new goal
 */
export const createGoal = (goalData) => {
  const goals = getGoals();
  
  const newGoal = {
    id: Math.random().toString(36).substr(2, 9),
    name: goalData.name,
    targetAmount: parseFloat(goalData.targetAmount),
    currentAmount: parseFloat(goalData.currentAmount || 0),
    deadline: goalData.deadline,
    category: goalData.category || 'General',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  goals.push(newGoal);
  saveGoals(goals);
  
  return newGoal;
};

/**
 * Update a goal
 */
export const updateGoal = (goalId, updates) => {
  const goals = getGoals();
  const index = goals.findIndex(g => g.id === goalId);
  
  if (index === -1) return null;

  goals[index] = {
    ...goals[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveGoals(goals);
  return goals[index];
};

/**
 * Delete a goal
 */
export const deleteGoal = (goalId) => {
  const goals = getGoals();
  const filtered = goals.filter(g => g.id !== goalId);
  saveGoals(filtered);
  return true;
};

/**
 * Calculate goal progress
 */
export const calculateGoalProgress = (goal) => {
  const progressPercent = goal.targetAmount > 0 
    ? (goal.currentAmount / goal.targetAmount) * 100 
    : 0;

  const remaining = goal.targetAmount - goal.currentAmount;

  // Calculate days until deadline
  const today = new Date();
  const deadlineDate = new Date(goal.deadline);
  const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  // Calculate required monthly savings
  const monthsRemaining = Math.max(1, daysRemaining / 30);
  const requiredMonthlySavings = remaining / monthsRemaining;

  // Status
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
};

/**
 * Get current savings rate from transactions
 */
export const calculateCurrentSavingsRate = (transactions, months = 1) => {
  if (!transactions || transactions.length === 0) return 0;

  // Filter to recent months
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const recentTransactions = transactions.filter(t => t.date >= cutoffStr);

  const income = recentTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = income - expenses;
  const monthlySavings = netSavings / months;

  return {
    monthlySavings,
    totalIncome: income,
    totalExpenses: expenses,
    netSavings,
    savingsRate: income > 0 ? (netSavings / income) * 100 : 0
  };
};

/**
 * Generate goal insights
 */
export const generateGoalInsights = (goal, progress, currentSavingsRate) => {
  const insights = [];

  // Progress insight
  if (progress.status === 'completed') {
    insights.push(`🎉 Congratulations! You've reached your goal: ${goal.name}`);
  } else if (progress.status === 'overdue') {
    insights.push(`⚠️ Your goal "${goal.name}" is ${progress.daysRemaining} days overdue`);
  } else if (progress.status === 'at-risk') {
    insights.push(`⚠️ You may not reach "${goal.name}" by the deadline - increase savings by £${(progress.requiredMonthlySavings - currentSavingsRate.monthlySavings).toFixed(2)}/month`);
  } else {
    insights.push(`You're ${progress.progressPercent.toFixed(0)}% toward your goal: ${goal.name}`);
  }

  // Savings rate comparison
  if (currentSavingsRate.monthlySavings > 0) {
    if (currentSavingsRate.monthlySavings >= progress.requiredMonthlySavings) {
      insights.push(`✅ You're saving £${currentSavingsRate.monthlySavings.toFixed(2)}/month - on track to reach your goal!`);
    } else {
      const shortfall = progress.requiredMonthlySavings - currentSavingsRate.monthlySavings;
      insights.push(`You need to save an extra £${shortfall.toFixed(2)}/month to reach your goal by ${goal.deadline}`);
    }
  }

  // Deadline insight
  if (progress.daysRemaining <= 30 && progress.status === 'on-track') {
    insights.push(`⏰ Only ${progress.daysRemaining} days left - you're in the home stretch!`);
  }

  // Progress milestone
  if (progress.progressPercent >= 25 && progress.progressPercent < 30) {
    insights.push(`🎯 Quarter of the way there! Keep up the good work`);
  } else if (progress.progressPercent >= 50 && progress.progressPercent < 55) {
    insights.push(`🎯 Halfway to your goal! You're doing great`);
  } else if (progress.progressPercent >= 75 && progress.progressPercent < 80) {
    insights.push(`🎯 Three-quarters done! The finish line is in sight`);
  }

  return insights;
};

/**
 * Suggest realistic goal deadline based on current savings
 */
export const suggestDeadline = (targetAmount, currentAmount, monthlySavings) => {
  const remaining = targetAmount - currentAmount;
  
  if (monthlySavings <= 0) {
    return {
      months: 12,
      date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      message: 'Set a 12-month goal to start building savings habits'
    };
  }

  const monthsNeeded = Math.ceil(remaining / monthlySavings);
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthsNeeded);

  return {
    months: monthsNeeded,
    date: targetDate.toISOString().split('T')[0],
    message: `At your current savings rate of £${monthlySavings.toFixed(2)}/month, you can reach this goal in ${monthsNeeded} months`
  };
};

/**
 * Auto-update goal current amount based on savings category transactions
 */
export const autoUpdateGoalProgress = (goal, transactions) => {
  // Only update if goal has a specific category
  if (!goal.category || goal.category === 'General') {
    return goal;
  }

  // Find transfers/savings to this category since goal creation
  const goalCreationDate = new Date(goal.createdAt).toISOString().split('T')[0];
  
  const savingsTransactions = transactions.filter(t => 
    t.date >= goalCreationDate &&
    t.category === goal.category &&
    (t.description.toLowerCase().includes('savings') || 
     t.description.toLowerCase().includes('transfer'))
  );

  if (savingsTransactions.length === 0) {
    return goal;
  }

  // Calculate total saved
  const totalSaved = savingsTransactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);

  const updatedAmount = goal.currentAmount + totalSaved;

  return updateGoal(goal.id, { currentAmount: updatedAmount });
};
