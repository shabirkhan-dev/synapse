"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@synapse/ui/components/alert-dialog";
import { Button } from "@synapse/ui/components/button";
import { useState } from "react";

export type DeleteDocumentProps = {
	title: string;
	chunkCount: number;
	deleting: boolean;
	onDelete: () => void;
};

const plural = new Intl.PluralRules("en");

/** Deleting one document is immediate, so it asks first, naming what goes. */
export function DeleteDocument({ title, chunkCount, deleting, onDelete }: DeleteDocumentProps) {
	const [open, setOpen] = useState(false);
	const chunks = plural.select(chunkCount) === "one" ? "Its chunk" : `Its ${chunkCount} chunks`;
	return (
		<>
			<Button variant="destructive" disabled={deleting} onClick={() => setOpen(true)}>
				{deleting ? "Deleting…" : "Delete document…"}
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
						<AlertDialogDescription>
							{chunks} {chunkCount === 1 ? "is" : "are"} deleted too, and answers stop citing it.
							This cannot be undone; add the text again to bring it back.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setOpen(false);
								onDelete();
							}}
						>
							Delete document
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
