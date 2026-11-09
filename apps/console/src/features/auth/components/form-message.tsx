import { Alert, AlertDescription } from "@synapse/ui/components/alert";

/** An API error (destructive) or a confirmation, above a form's button. */
export function FormMessage({
	error,
	success,
}: {
	error?: string | null | undefined;
	success?: string | null | undefined;
}) {
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}
	if (success) {
		return (
			<Alert>
				<AlertDescription>{success}</AlertDescription>
			</Alert>
		);
	}
	return null;
}
