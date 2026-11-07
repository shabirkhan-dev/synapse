"use client";

import { Button } from "@rabtx/ui/button";
import { Toaster, toast } from "@rabtx/ui/toast";

export default function ToastAction() {
	return (
		<>
			<Button
				variant="secondary"
				onClick={() =>
					toast("Archived 3 conversations", {
						action: { label: "Undo", onClick: () => toast.success("Restored") },
					})
				}
			>
				Archive
			</Button>
			<Button
				variant="outline"
				onClick={() =>
					toast.warning("Leave the call?", {
						description: "Your microphone is still on.",
						duration: Infinity,
						cancel: { label: "Stay" },
						action: { label: "Leave", onClick: () => toast("You left the call") },
					})
				}
			>
				Leave call
			</Button>
			<Toaster />
		</>
	);
}
