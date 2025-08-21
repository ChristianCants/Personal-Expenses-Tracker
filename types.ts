export enum ExpenseCategory {
  Groceries = "Groceries",
  Transport = "Transport",
  Utilities = "Utilities",
  DiningOut = "Dining Out",
  Entertainment = "Entertainment",
  Health = "Health",
  Shopping = "Shopping",
  Subscriptions = "Subscriptions",
  Other = "Other",
}

export interface Expense {
  id: number;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // ISO string format
  created_at?: string;
}

export interface Budget {
  category: ExpenseCategory;
  limit: number;
}

export interface RecurringExpense {
  id: number;
  amount: number;
  category: ExpenseCategory;
  description: "Subscription" | "Bill" | string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_due_date: string; // ISO string format
  created_at?: string;
}

export interface SavingsTransaction {
  id: number;
  amount: number;
  date: string; // ISO string
  created_at?: string;
}

export enum AppView {
  Dashboard = "Dashboard",
  Budgets = "Budgets",
  Recurring = "Recurring",
  Savings = "Savings",
  AIAdvisor = "AI Advisor",
}