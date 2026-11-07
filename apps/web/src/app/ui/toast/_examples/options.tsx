"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";
import { Toaster, toast } from "@rabtx/ui/toast";

const copyIcon = <HugeiconsIcon icon={Copy01Icon} size={16} />;

export default function ToastOptions() {
	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					toast.info("Update ready", {
						description: "Stays until you dismiss it.",
						duration: Infinity,
					})
				}
			>
				Persistent
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					toast("Link copied", {
						duration: 1500,
						icon: copyIcon,
					})
				}
			>
				Short, custom icon
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					toast.error("Session expired", {
						description: "Sign in again to keep editing.",
						dismissible: false,
						action: { label: "Sign in" },
					})
				}
			>
				Not dismissible
			</Button>
			<Button variant="ghost" size="sm" onClick={() => toast.dismiss()}>
				Dismiss all
			</Button>
			<Toaster />
		</>
	);
}
