"use client";

import { Button } from "@rabtx/ui/button";
import { Toaster, toast } from "@rabtx/ui/toast";

export default function ToastTypes() {
	return (
		<>
			<Button variant="outline" size="sm" onClick={() => toast("Draft saved")}>
				Default
			</Button>
			<Button variant="outline" size="sm" onClick={() => toast.success("Invite sent")}>
				Success
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => toast.info("Sync resumes at 9:00", { description: "You are offline." })}
			>
				Info
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => toast.warning("Storage almost full", { description: "92% of 15 GB used" })}
			>
				Warning
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => toast.error("Payment failed", { description: "Your card was declined." })}
			>
				Error
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => {
					const id = toast.loading("Connecting…");
					setTimeout(() => toast.success("Connected", { id }), 1500);
				}}
			>
				Loading
			</Button>
			<Toaster />
		</>
	);
}
