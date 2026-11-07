"use client";

import { Button } from "@rabtx/ui/button";
import { Toaster, toast } from "@rabtx/ui/toast";

export default function ToastDefault() {
	return (
		<>
			<Button
				variant="secondary"
				onClick={() =>
					toast("Event created", {
						description: "Sunday, November 1 at 9:00",
						action: { label: "Undo", onClick: () => toast("Event removed") },
					})
				}
			>
				Show toast
			</Button>
			<Toaster />
		</>
	);
}
