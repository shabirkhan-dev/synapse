import { Input } from "@synapse/ui/components/input";
import { Label } from "@synapse/ui/components/label";
import type { ComponentProps } from "react";

export type FormFieldProps = Omit<ComponentProps<"input">, "id" | "name"> & {
	name: string;
	label: string;
	/** Shown under the input and linked to it for screen readers. */
	error?: string | undefined;
};

/** Label + input + error message, wired with `aria-invalid` / `aria-describedby`. */
export function FormField({ name, label, error, ...input }: FormFieldProps) {
	const errorId = `${name}-error`;
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={name}>{label}</Label>
			<Input
				id={name}
				name={name}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				{...input}
			/>
			{error ? (
				<p id={errorId} className="text-xs text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
