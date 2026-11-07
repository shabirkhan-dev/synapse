import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets a later Tailwind class win over an earlier one (shadcn's `cn`). */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
