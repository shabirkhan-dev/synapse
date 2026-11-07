"use client";

import { Button } from "@rabtx/ui/button";
import { Toaster, toast } from "@rabtx/ui/toast";

/** Pretends to upload: resolves with a file count, or fails one time in three. */
function upload() {
	return new Promise<number>((resolve, reject) => {
		setTimeout(
			() => (Math.random() < 0.33 ? reject(new Error("Network lost")) : resolve(12)),
			1800,
		);
	});
}

export default function ToastPromise() {
	return (
		<>
			<Button
				variant="secondary"
				onClick={() =>
					toast.promise(upload, {
						loading: "Uploading 12 photos…",
						success: (count) => `Uploaded ${count} photos`,
						error: (error) => ({
							title: "Upload failed",
							description: (error as Error).message,
							action: { label: "Retry", onClick: () => toast("Retrying…") },
						}),
					})
				}
			>
				Upload photos
			</Button>
			<Toaster />
		</>
	);
}
