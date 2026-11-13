const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export const formatRecall = (value: number): string => percent.format(value);
export const formatMrr = (value: number): string => decimal.format(value);
export const formatWhen = (iso: string): string => when.format(new Date(iso));
