export type MoneyType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  walletId: string;
  balance: number;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  type: MoneyType;
  icon?: string | null;
  color?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  categoryId: string;
  type: MoneyType;
  amount: number;
  note?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Summary {
  from: string;
  to: string;
  incomes: number;
  expenses: number;
  net: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  color: string;
  type: MoneyType;
  amount: number;
}

export interface DayStat {
  date: string;
  incomes: number;
  expenses: number;
  net: number;
}

export interface AnalyzeInsight {
  headline: string;
  summary: string;
  highlights: string[];
  risks: string[];
  tips: string[];
  topCategories: string[];
}

export interface AskInsight {
  answer: string;
  bullets: string[];
}

export interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
}

export type AssistActionType = 'CREATE_TRANSACTION' | 'NAVIGATE' | 'TIP';

export interface TransactionDraft {
  amount: number;
  type: MoneyType;
  note?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  walletId?: string | null;
  walletName?: string | null;
}

export interface AssistAction {
  type: AssistActionType;
  needsConfirm?: boolean | null;
  draft?: TransactionDraft | null;
  route?: string | null;
  params?: Record<string, string> | null;
  text?: string | null;
}

export interface AssistResult {
  reply: string;
  hints: string[];
  actions: AssistAction[];
}

export interface AssistConfirmResult {
  reply: string;
  transaction: Transaction;
}

export interface ProactiveAlert {
  id: string;
  severity: 'info' | 'warning' | string;
  title: string;
  body: string;
  action?: Record<string, string> | null;
}

export interface ProactiveResult {
  alerts: ProactiveAlert[];
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
