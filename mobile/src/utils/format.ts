export const DEFAULT_CURRENCY = 'KZT';

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ₸`;
  }
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function monthRange(date = new Date()): { from: string; to: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function moneyTypeLabel(type: 'INCOME' | 'EXPENSE'): string {
  return type === 'INCOME' ? 'Доход' : 'Расход';
}

export function getErrorMessage(error: unknown, fallback = 'Что-то пошло не так'): string {
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (anyErr.response?.data?.message) {
      return anyErr.response.data.message;
    }
    if (anyErr.message) {
      return anyErr.message;
    }
  }
  return fallback;
}
