export const formatDate = (date: string | null, language: string) => {
  if (!date) return '';
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatMoney = (
  amount: number,
  currency: string | null | undefined,
  language: string
) => {
  const safeCurrency = currency && currency.length === 3 ? currency : "USD";
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
