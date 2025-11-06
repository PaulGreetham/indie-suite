export function formatCurrency(amount: number, currency: string = "GBP", locale: string = "en-GB"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function cn(...classNames: Array<string | undefined | false | null>): string {
  return classNames.filter(Boolean).join(" ");
}


