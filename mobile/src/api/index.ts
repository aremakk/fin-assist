import { api } from './client';
import type {
  AuthResponse,
  Balance,
  Category,
  CategoryStat,
  CategorySuggestion,
  DayStat,
  AnalyzeInsight,
  AskInsight,
  AssistConfirmResult,
  AssistResult,
  MoneyType,
  PageResponse,
  ProactiveResult,
  Summary,
  Transaction,
  User,
  Wallet,
} from '../types';

export const authApi = {
  register: (payload: { email: string; password: string; displayName: string }) =>
    api.post<AuthResponse>('/auth/register', payload).then((r) => r.data),
  login: (payload: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updateProfile: (displayName: string) =>
    api.put<User>('/users/me', { displayName }).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/me/password', { currentPassword, newPassword }),
};

export const walletsApi = {
  list: () => api.get<Wallet[]>('/wallets').then((r) => r.data),
  create: (payload: { name: string; initialBalance?: number }) =>
    api.post<Wallet>('/wallets', payload).then((r) => r.data),
  update: (id: string, payload: { name: string; initialBalance?: number }) =>
    api.put<Wallet>(`/wallets/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/wallets/${id}`),
  balance: (id: string) => api.get<Balance>(`/wallets/${id}/balance`).then((r) => r.data),
};

export const categoriesApi = {
  list: (type?: MoneyType) =>
    api.get<Category[]>('/categories', { params: { type } }).then((r) => r.data),
  create: (payload: { name: string; type: MoneyType; icon?: string; color?: string }) =>
    api.post<Category>('/categories', payload).then((r) => r.data),
  update: (
    id: string,
    payload: { name: string; type: MoneyType; icon?: string; color?: string }
  ) => api.put<Category>(`/categories/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const transactionsApi = {
  list: (params: {
    page?: number;
    size?: number;
    from?: string;
    to?: string;
    type?: MoneyType;
    categoryId?: string;
    walletId?: string;
    q?: string;
  }) => api.get<PageResponse<Transaction>>('/transactions', { params }).then((r) => r.data),
  get: (id: string) => api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),
  create: (payload: {
    walletId: string;
    categoryId: string;
    type: MoneyType;
    amount: number;
    note?: string;
    occurredAt: string;
  }) => api.post<Transaction>('/transactions', payload).then((r) => r.data),
  update: (
    id: string,
    payload: {
      walletId: string;
      categoryId: string;
      type: MoneyType;
      amount: number;
      note?: string;
      occurredAt: string;
    }
  ) => api.put<Transaction>(`/transactions/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/transactions/${id}`),
};

export const statsApi = {
  summary: (from: string, to: string, walletId?: string) =>
    api.get<Summary>('/stats/summary', { params: { from, to, walletId } }).then((r) => r.data),
  byCategory: (from: string, to: string, type?: MoneyType, walletId?: string) =>
    api
      .get<CategoryStat[]>('/stats/by-category', { params: { from, to, type, walletId } })
      .then((r) => r.data),
  byDay: (from: string, to: string, walletId?: string) =>
    api.get<DayStat[]>('/stats/by-day', { params: { from, to, walletId } }).then((r) => r.data),
};

export const insightsApi = {
  analyze: (payload: { from: string; to: string; walletId?: string }) =>
    api.post<AnalyzeInsight>('/insights/analyze', payload).then((r) => r.data),
  ask: (payload: { question: string; from?: string; to?: string; walletId?: string }) =>
    api.post<AskInsight>('/insights/ask', payload).then((r) => r.data),
  suggestCategory: (payload: {
    type: MoneyType;
    amount: number;
    note?: string;
    walletId?: string;
  }) => api.post<CategorySuggestion>('/insights/suggest-category', payload).then((r) => r.data),
  assist: (payload: { message?: string; screen: string }) =>
    api.post<AssistResult>('/insights/assist', payload).then((r) => r.data),
  confirmAssist: (payload: {
    type: string;
    draft: {
      amount: number;
      type: MoneyType;
      note?: string;
      categoryId?: string;
      walletId?: string;
    };
  }) => api.post<AssistConfirmResult>('/insights/assist/confirm', payload).then((r) => r.data),
  proactive: () => api.get<ProactiveResult>('/insights/proactive').then((r) => r.data),
};
