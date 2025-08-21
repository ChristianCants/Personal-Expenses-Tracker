
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Expense, Budget } from '../types';
import { CURRENCY } from '../constants';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const generatePrompt = (
  promptType: 'analysis' | 'summary' | 'prediction' | 'alert',
  expenses: Expense[],
  budgets: Budget[],
  savings: { goal: number; totalSaved: number },
  alertInfo?: { category: string; spent: number; limit: number }
): string => {
  const dataContext = `
    Here is the user's financial data. All monetary values are in ${CURRENCY}.
    - Savings Goal: ${savings.goal}
    - Amount Saved So Far: ${savings.totalSaved}
    - Budgets: ${JSON.stringify(budgets)}
    - Recent Expenses: ${JSON.stringify(expenses.slice(0, 50))}
  `;

  switch (promptType) {
    case 'analysis':
      return `
        You are a friendly and insightful AI Financial Advisor. 
        ${dataContext}
        Analyze the user's spending patterns from the recent expenses.
        Provide actionable budgeting advice and recommendations for saving money based on their behavior and their progress towards their savings goal.
        Identify the top 3 spending categories and suggest specific ways to cut costs in those areas.
        Keep the tone encouraging and helpful. Format your response in markdown.
      `;
    case 'summary':
      return `
        You are a helpful AI Financial Advisor generating a monthly summary.
        ${dataContext}
        Provide a concise monthly financial summary. Mention total spending, how they did against their budgets, and their savings progress towards their goal.
        Offer 3 clear, actionable tips for improving their financial health next month.
        Format your response in markdown with clear headings.
      `;
    case 'prediction':
      return `
        You are a predictive AI Financial Advisor.
        ${dataContext}
        Based on the provided recent expenses, predict the user's total expenses for the next 30 days.
        Also, predict the spending for their top 3 most expensive categories.
        Suggest one key area where they could optimize spending to positively impact their future finances and savings goal.
        Format your response in markdown.
      `;
    case 'alert':
      return `
        You are a proactive AI Financial Advisor.
        The user's spending in the '${alertInfo?.category}' category is approaching or has exceeded its budget.
        - Budget Limit: ${alertInfo?.limit}
        - Amount Spent: ${alertInfo?.spent}
        Write a brief, encouraging alert (2-3 sentences). Offer a quick, practical tip to help them manage their spending in this category for the rest of the month.
      `;
    default:
      return '';
  }
};


export const getFinancialAdvice = async (
  promptType: 'analysis' | 'summary' | 'prediction' | 'alert',
  expenses: Expense[],
  budgets: Budget[],
  savings: { goal: number; totalSaved: number },
  alertInfo?: { category: string; spent: number; limit: number }
): Promise<string> => {
  if (!API_KEY) {
    return "Error: API key is not configured. Please set the API_KEY environment variable.";
  }

  const prompt = generatePrompt(promptType, expenses, budgets, savings, alertInfo);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching financial advice from Gemini API:", error);
    return "I'm sorry, I encountered an issue while analyzing your data. Please check your connection or API key and try again.";
  }
};