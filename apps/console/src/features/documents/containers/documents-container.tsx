"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";

import { DocumentsTable } from "../components/documents-table";
import { IngestDocumentForm } from "../components/ingest-document-form";
import { useIngestDocumentMutation } from "../hooks/mutations/use-ingest-document-mutation";
import { useDocumentsQuery } from "../hooks/queries/use-documents-query";

/** Documents page: the add form and the list, with loading, error and empty states. */
export function DocumentsContainer() {
	const documents = useDocumentsQuery();
	const ingest = useIngestDocumentMutation();

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Documents</h1>
				<p className="text-xs text-muted-foreground">
					What answers and chat search draw on. Adding text chunks and embeds it.
				</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Add a document</CardTitle>
					<CardDescription>Paste plain text; the same text twice is stored once.</CardDescription>
				</CardHeader>
				<CardContent>
					<IngestDocumentForm
						pending={ingest.isPending}
						error={ingest.error ? ingest.error.message : null}
						onSubmit={(input) => ingest.mutateAsync(input)}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Your documents</CardTitle>
				</CardHeader>
				<CardContent>
					{documents.isPending ? (
						<p className="text-xs text-muted-foreground" role="status">
							Loading documents…
						</p>
					) : documents.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Documents could not be loaded</AlertTitle>
							<AlertDescription className="flex items-center gap-3">
								{documents.error.message}
								<Button size="sm" variant="outline" onClick={() => documents.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : documents.data.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No documents yet. Add one above to start answering questions from it.
						</p>
					) : (
						<DocumentsTable documents={documents.data} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
