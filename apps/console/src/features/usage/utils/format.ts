const integer = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("en", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 4,
});
const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export const formatCount = (value: number): string => integer.format(value);
/** "12.4K" for tiles; tables keep the exact number. */
export const formatCompact = (value: number): string => compact.format(value);
export const formatUsd = (value: number): string => usd.format(value);
/** A `YYYY-MM-DD` UTC day as "Nov 12". */
export const formatDay = (value: string): string => day.format(new Date(`${value}T00:00:00Z`));
