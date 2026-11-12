"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@synapse/ui/components/alert-dialog";
import { Button } from "@synapse/ui/components/button";
import Link from "next/link";
import { useState } from "react";

export type PurgeRequestProps = {
	onRequest: () => void;
	pending: boolean;
	/** True once the request exists (it waits for an admin or owner). */
	requested: boolean;
	error: string | null;
};

/** "Delete all documents": confirm, then it waits for approval instead of deleting at once. */
export function PurgeRequest({ onRequest, pending, requested, error }: PurgeRequestProps) {
	// Controlled: the confirm button is a plain button, so it closes the dialog itself.
	const [open, setOpen] = useState(false);
	return (
		<div className="flex flex-col gap-3">
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogTrigger
					render={<Button variant="destructive" className="self-start" disabled={pending} />}
				>
					Delete all documents…
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete every document?</AlertDialogTitle>
						<AlertDialogDescription>
							All documents and their chunks are removed for everyone in this workspace. Nothing
							happens until an admin or owner approves the request.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setOpen(false);
								onRequest();
							}}
						>
							Ask for approval
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{requested ? (
				<Alert>
					<AlertDescription>
						Requested. It runs once approved —{" "}
						<Link href="/approvals" className="underline underline-offset-4">
							see Approvals
						</Link>
						.
					</AlertDescription>
				</Alert>
			) : null}
			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
