
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Expense, ExpenseCategory, Budget, RecurringExpense, SavingsTransaction, AppView } from './types';
import { CATEGORIES, CURRENCY, CURRENCY_SYMBOL } from './constants';
import { getFinancialAdvice } from './services/geminiService';
import { supabase } from './supabaseClient';

// --- HELPER UTILS ---

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setHours(0, 0, 0, 0);
  return new Date(date.setDate(diff));
};

const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const getStartOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

const formatNumber = (amount: number): string => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrency = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${formatNumber(amount)}`;
};

const parseFormattedNumber = (value: string): number => {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};


// --- SVG ICONS ---
const Icons = {
  Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Budget: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Recurring: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>,
  Savings: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  AI: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110 2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  Pencil: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
};

// --- UI COMPONENTS ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-card shadow-sm rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; className?: string; }> = ({ onClick, children, variant = 'primary', className }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center transition-transform transform hover:scale-105';
  const variantClasses = {
    primary: 'bg-primary hover:bg-indigo-700 focus:ring-primary',
    secondary: 'bg-secondary hover:bg-emerald-600 focus:ring-secondary',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  return <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>{children}</button>;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.Close />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

interface ExpenseFormProps {
  onSave: (expense: Omit<Expense, 'id' | 'created_at'>) => void;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}
const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSave, onClose, expenseToEdit }) => {
  const [amount, setAmount] = useState(expenseToEdit?.amount.toString() || '');
  const [category, setCategory] = useState<ExpenseCategory>(expenseToEdit?.category || ExpenseCategory.Groceries);
  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [date, setDate] = useState(expenseToEdit ? expenseToEdit.date.split('T')[0] : formatDate(new Date()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) > 0) {
      onSave({
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(date).toISOString(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary">Amount ({CURRENCY_SYMBOL})</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-transparent">
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Description</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Weekly groceries" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary bg-transparent" />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
        <Button onClick={() => { }}>{expenseToEdit ? 'Save Changes' : 'Add Expense'}</Button>
      </div>
    </form>
  );
};


const PIE_CHART_COLORS = ['#4f46e5', '#10b981', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

interface CategoryPieChartProps {
  data: { name: string; value: number }[];
}
const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={(entry) => entry.name}>
        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(value: number) => formatCurrency(value)} />
    </PieChart>
  </ResponsiveContainer>
);

interface MonthlyBarChartProps {
  data: any[];
}
const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <XAxis dataKey="name" stroke="#6b7280" />
      <YAxis stroke="#6b7280" tickFormatter={(value) => `${CURRENCY_SYMBOL}${value / 1000}k`} />
      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Expenses']} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }} />
      <Legend />
      <Bar dataKey="expenses" fill="#4f46e5" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);


// --- MAIN APP COMPONENT ---

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<AppView>(AppView.Dashboard);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- DATA FETCHING ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        expensesRes,
        budgetsRes,
        savingsRes,
        savingsGoalRes,
        recurringRes,
      ] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('budgets').select('*'),
        supabase.from('savings_transactions').select('*').order('date', { ascending: false }),
        supabase.from('app_config').select('value').eq('key', 'savingsGoal').single(),
        supabase.from('recurring_expenses').select('*'),
      ]);

      if (expensesRes.error) throw expensesRes.error;
      setExpenses(expensesRes.data || []);

      if (budgetsRes.error) throw budgetsRes.error;
      setBudgets(budgetsRes.data || []);

      if (savingsRes.error) throw savingsRes.error;
      setSavingsTransactions(savingsRes.data || []);

      if (savingsGoalRes.error) throw savingsGoalRes.error;
      setSavingsGoal(Number(savingsGoalRes.data?.value) || 50000);

      if (recurringRes.error) throw recurringRes.error;
      setRecurringExpenses(recurringRes.data || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- DATA MUTATIONS ---
  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    try {
      if (expenseToEdit) {
        // Update
        const { error } = await supabase.from('expenses').update(expenseData).eq('id', expenseToEdit.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('expenses').insert(expenseData);
        if (error) throw error;
      }
      await fetchAllData(); // Refetch all data for consistency
      closeModal();
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        setExpenses(prev => prev.filter(exp => exp.id !== id));
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  const handleDeleteSavingsTransaction = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this savings deposit? This action will reduce your total saved amount.')) {
      try {
        const { error } = await supabase.from('savings_transactions').delete().eq('id', id);
        if (error) throw error;
        setSavingsTransactions(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error("Error deleting savings transaction:", error);
      }
    }
  };

  const handleBudgetChange = async (category: ExpenseCategory, limit: number) => {
    const newLimit = isNaN(limit) ? 0 : limit;
    try {
      const { error } = await supabase.from('budgets').update({ limit: newLimit }).eq('category', category);
      if (error) throw error;
      setBudgets(budgets.map(b => b.category === category ? { ...b, limit: newLimit } : b));
    } catch (error) {
      console.error("Error updating budget:", error);
    }
  };

  const handleSetSavingsGoal = async (goal: number) => {
    const newGoal = isNaN(goal) ? 0 : goal;
    setSavingsGoal(newGoal); // Optimistic update
    try {
      const { error } = await supabase.from('app_config').update({ value: newGoal }).eq('key', 'savingsGoal');
      if (error) throw error;
    } catch (error) {
      console.error("Error setting savings goal:", error);
    }
  };

  const handleAddToSavings = async (amount: number) => {
    if (amount > 0) {
      try {
        const newTransaction = { amount, date: new Date().toISOString() };
        const { error } = await supabase.from('savings_transactions').insert(newTransaction);
        if (error) throw error;
        await fetchAllData();
      } catch (error) {
        console.error("Error adding to savings:", error);
      }
    }
  };

  const openModal = (expense?: Expense) => {
    setExpenseToEdit(expense || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setExpenseToEdit(null);
  };

  const totalSaved = useMemo(() => savingsTransactions.reduce((acc, curr) => acc + curr.amount, 0), [savingsTransactions]);

  const handleGetAIAdvice = useCallback(async (type: 'analysis' | 'summary' | 'prediction') => {
    setIsAiLoading(true);
    setAiResponse('');
    const recentExpenses = expenses.filter(e => new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const savingsData = { goal: savingsGoal, totalSaved };
    const response = await getFinancialAdvice(type, recentExpenses, budgets, savingsData);
    setAiResponse(response);
    setIsAiLoading(false);
  }, [expenses, budgets, savingsGoal, totalSaved]);

  // Memoized calculations
  const { dailyTotal, weeklyTotal, monthlyTotal, yearlyTotal, periods } = useMemo(() => {
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = getStartOfMonth(now);
    const startOfYear = getStartOfYear(now);

    const totals = expenses.reduce((acc, exp) => {
      const expDate = new Date(exp.date);
      if (formatDate(expDate) === formatDate(now)) acc.dailyTotal += exp.amount;
      if (expDate >= startOfWeek) acc.weeklyTotal += exp.amount;
      if (expDate >= startOfMonth) acc.monthlyTotal += exp.amount;
      if (expDate >= startOfYear) acc.yearlyTotal += exp.amount;
      return acc;
    }, { dailyTotal: 0, weeklyTotal: 0, monthlyTotal: 0, yearlyTotal: 0 });

    const periods = {
      daily: `for ${now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`,
      weekly: `since ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      monthly: `since ${startOfMonth.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`,
      yearly: `since ${startOfYear.toLocaleDateString(undefined, { year: 'numeric' })}`
    };

    return { ...totals, periods };
  }, [expenses]);

  const monthlyCategorySpending = useMemo(() => {
    const startOfMonth = getStartOfMonth(new Date());
    const monthlyExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth);

    return CATEGORIES.map(category => {
      const total = monthlyExpenses
        .filter(e => e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: category, value: total };
    }).filter(c => c.value > 0);
  }, [expenses]);

  const historicalMonthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { name: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
    }).reverse();

    return months.map(m => {
      const total = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: m.name, expenses: total };
    });
  }, [expenses]);


  const renderView = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
    }
    switch (activeView) {
      case AppView.Dashboard: return <DashboardView />;
      case AppView.Budgets: return <BudgetView />;
      case AppView.Savings: return <SavingsView />;
      case AppView.AIAdvisor: return <AIAdvisorView />;
      default: return <DashboardView />;
    }
  };

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Today's Expenses" amount={dailyTotal} period={periods.daily} />
        <SummaryCard title="This Week's Expenses" amount={weeklyTotal} period={periods.weekly} />
        <SummaryCard title="This Month's Expenses" amount={monthlyTotal} period={periods.monthly} />
        <SummaryCard title="This Year's Expenses" amount={yearlyTotal} period={periods.yearly} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Monthly Spending History</h3>
          <MonthlyBarChart data={historicalMonthlyData} />
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-text-primary mb-4">This Month by Category</h3>
          <CategoryPieChart data={monthlyCategorySpending} />
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {expenses.slice(0, 10).map(exp => (
            <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-text-primary">{exp.description}</p>
                <p className="text-sm text-text-secondary">{exp.category} &bull; {new Date(exp.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="font-semibold text-lg text-red-500">{formatCurrency(exp.amount)}</p>
                <button onClick={() => openModal(exp)} className="text-gray-400 hover:text-primary"><Icons.Pencil /></button>
                <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500"><Icons.Trash /></button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-center text-text-secondary py-4">No transactions yet. Add one to get started!</p>}
        </div>
      </Card>
    </div>
  );

  const BudgetView = () => {
    const monthlySpending = useMemo(() => {
      const startOfMonth = getStartOfMonth(new Date());
      return expenses.filter(e => new Date(e.date) >= startOfMonth)
        .reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {} as Record<ExpenseCategory, number>);
    }, [expenses]);

    return (
      <Card>
        <h2 className="text-2xl font-bold text-text-primary mb-6">Monthly Budgets</h2>
        <div className="space-y-4">
          {budgets.map(budget => {
            const spent = monthlySpending[budget.category] || 0;
            const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
            const progressBarColor = percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-primary';
            return (
              <div key={budget.category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">{budget.category}</span>
                  <span className="text-sm text-text-secondary">{formatCurrency(spent)} / {formatCurrency(budget.limit)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={progressBarColor} style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', borderRadius: '9999px' }}></div>
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm mr-2">Set Budget: {CURRENCY_SYMBOL}</span>
                  <input
                    type="text"
                    placeholder="0"
                    defaultValue={budget.limit > 0 ? budget.limit.toLocaleString('en-US') : ''}
                    onBlur={(e) => handleBudgetChange(budget.category, parseFormattedNumber(e.target.value))}
                    className="w-32 border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-primary focus:border-primary bg-transparent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const SavingsView = () => {
    const [amountToAdd, setAmountToAdd] = useState<number>(0);

    const addFunds = async () => {
      await handleAddToSavings(amountToAdd);
      setAmountToAdd(0);
    }

    const quickAddToSavings = (amount: number) => {
      setAmountToAdd(prev => prev + amount);
    };

    const progress = savingsGoal > 0 ? (totalSaved / savingsGoal) * 100 : 0;
    const progressBarColor = progress >= 100 ? 'bg-secondary' : 'bg-primary';

    return (
      <div className="space-y-6">
        <Card>
          <h2 className="text-2xl font-bold text-text-primary mb-2">My Savings Pot</h2>
          <p className="text-4xl font-bold text-secondary mb-4">{formatCurrency(totalSaved)}</p>

          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm text-text-secondary">Goal Progress</span>
            <span className="text-sm font-semibold">{formatCurrency(savingsGoal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div className={progressBarColor} style={{ width: `${Math.min(progress, 100)}%`, height: '100%', borderRadius: '9999px', transition: 'width 0.5s ease-in-out' }}></div>
          </div>
          <div className="flex items-center mt-4">
            <label htmlFor="savingsGoal" className="text-sm font-medium text-text-secondary mr-2">Set Your Goal:</label>
            <input
              id="savingsGoal"
              type="text"
              placeholder="0"
              defaultValue={savingsGoal > 0 ? savingsGoal.toLocaleString('en-US') : ''}
              onBlur={(e) => handleSetSavingsGoal(parseFormattedNumber(e.target.value))}
              className="w-40 border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-primary focus:border-primary bg-transparent"
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Add to Savings</h3>
          <div className="flex items-center space-x-4">
            <div className="relative flex-grow">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">{CURRENCY_SYMBOL}</span>
              <input
                type="text"
                value={amountToAdd > 0 ? amountToAdd.toLocaleString('en-US') : ''}
                onChange={(e) => setAmountToAdd(parseFormattedNumber(e.target.value))}
                placeholder="Enter amount"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-7 pr-3 focus:outline-none focus:ring-primary focus:border-primary bg-transparent"
              />
            </div>
            <Button onClick={addFunds}>Add Funds</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => quickAddToSavings(100)} className="px-3 py-1 text-sm font-semibold bg-gray-200 hover:bg-gray-300 rounded-lg text-text-secondary transition-colors">+ {CURRENCY_SYMBOL}100</button>
            <button onClick={() => quickAddToSavings(500)} className="px-3 py-1 text-sm font-semibold bg-gray-200 hover:bg-gray-300 rounded-lg text-text-secondary transition-colors">+ {CURRENCY_SYMBOL}500</button>
            <button onClick={() => quickAddToSavings(1000)} className="px-3 py-1 text-sm font-semibold bg-gray-200 hover:bg-gray-300 rounded-lg text-text-secondary transition-colors">+ {CURRENCY_SYMBOL}1,000</button>
            <button onClick={() => quickAddToSavings(5000)} className="px-3 py-1 text-sm font-semibold bg-gray-200 hover:bg-gray-300 rounded-lg text-text-secondary transition-colors">+ {CURRENCY_SYMBOL}5,000</button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Savings History</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {savingsTransactions.map(trans => (
              <div key={trans.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-text-primary">Deposit</p>
                  <p className="text-sm text-text-secondary">{new Date(trans.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="font-semibold text-lg text-secondary">+{CURRENCY_SYMBOL}{trans.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <button onClick={() => handleDeleteSavingsTransaction(trans.id)} className="text-gray-400 hover:text-red-500"><Icons.Trash /></button>
                </div>
              </div>
            ))}
            {savingsTransactions.length === 0 && <p className="text-center text-text-secondary py-4">No savings deposits yet.</p>}
          </div>
        </Card>
      </div>
    );
  };

  const AIAdvisorView = () => (
    <Card>
      <h2 className="text-2xl font-bold text-text-primary mb-4">Personal AI Financial Advisor</h2>
      <p className="text-text-secondary mb-6">Get personalized insights and advice on your spending habits from our AI-powered advisor.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button onClick={() => handleGetAIAdvice('analysis')} variant="secondary">Analyze My Spending</Button>
        <Button onClick={() => handleGetAIAdvice('summary')} variant="secondary">Get Monthly Summary</Button>
        <Button onClick={() => handleGetAIAdvice('prediction')} variant="secondary">Predict Future Expenses</Button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg min-h-[300px]">
        {isAiLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-text-secondary">Your advisor is thinking...</p>
          </div>
        ) : (
          <div className="prose max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, '<br />') || "Your AI-generated advice will appear here. Select an option above to get started." }}></div>
        )}
      </div>
    </Card>
  );

  const SummaryCard = ({ title, amount, period }: { title: string, amount: number, period: string }) => (
    <Card>
      <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</h4>
      <p className="text-3xl font-bold text-text-primary mt-1">{formatCurrency(amount)}</p>
      <p className="text-xs text-text-secondary">{period}</p>
    </Card>
  );

  return (
    <div className="min-h-screen font-sans text-text-primary">
      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-card shadow-md h-screen sticky top-0 p-4 flex flex-col">
          <div className="text-primary text-2xl font-bold mb-10 text-center py-4">
            Chanexhll
          </div>
          <ul className="space-y-2">
            {[AppView.Dashboard, AppView.Budgets, AppView.Savings, AppView.AIAdvisor].map(view => (
              <li key={view}>
                <button
                  onClick={() => setActiveView(view)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left font-semibold transition-colors ${activeView === view
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text-secondary hover:bg-gray-100'
                    }`}
                >
                  {view === AppView.Dashboard && <Icons.Dashboard />}
                  {view === AppView.Budgets && <Icons.Budget />}
                  {view === AppView.Recurring && <Icons.Recurring />}
                  {view === AppView.Savings && <Icons.Savings />}
                  {view === AppView.AIAdvisor && <Icons.AI />}
                  <span>{view}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <Button onClick={() => openModal()} className="w-full">
              <Icons.Plus /> Add Expense
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-text-primary"> Hello, Chanexhll</h1>
            <p className="text-text-secondary mt-1">Here's your financial overview.</p>
          </header>
          {renderView()}
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={expenseToEdit ? 'Edit Expense' : 'Add New Expense'}>
        <ExpenseForm onSave={handleSaveExpense} onClose={closeModal} expenseToEdit={expenseToEdit} />
      </Modal>
    </div>
  );
}
