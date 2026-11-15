"use client";

import { Files01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { Separator } from "@synapse/ui/components/separator";

import { PurgeRequestContainer } from "@/features/oversight";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

import { DocumentsTable } from "../components/documents-table";
import { IngestDocumentForm } from "../components/ingest-document-form";
import { UploadDocumentForm } from "../components/upload-document-form";
import { useIngestDocumentMutation } from "../hooks/mutations/use-ingest-document-mutation";
import { useUploadDocumentMutation } from "../hooks/mutations/use-upload-document-mutation";
import { useDocumentsQuery } from "../hooks/queries/use-documents-query";

/** Documents page: the add form and the list, with loading, error and empty states. */
export function DocumentsContainer() {
	const documents = useDocumentsQuery();
	const ingest = useIngestDocumentMutation();
	const upload = useUploadDocumentMutation();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Documents">
				What answers and chat search draw on. Adding text chunks and embeds it.
			</PageHeader>
			<Card>
				<CardHeader>
					<CardTitle>Add a document</CardTitle>
					<CardDescription>
						Upload a file or paste text; the same text twice is stored once.
					</CardDescription>
				</CardHeader>
				{/* Side by side on wide screens: one way or the other, never both. */}
				<CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
					<UploadDocumentForm
						pending={upload.isPending}
						error={upload.error ? upload.error.message : null}
						onSubmit={(input) => upload.mutateAsync(input)}
						onFileChange={upload.reset}
					/>
					<div className="flex items-center gap-3 text-xs text-muted-foreground lg:flex-col">
						<Separator className="flex-1 lg:hidden" />
						<Separator orientation="vertical" className="hidden flex-1 lg:block" />
						<span>or paste text</span>
						<Separator className="flex-1 lg:hidden" />
						<Separator orientation="vertical" className="hidden flex-1 lg:block" />
					</div>
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
						<EmptyState icon={Files01Icon} title="No documents yet">
							Add one above to start answering questions from it.
						</EmptyState>
					) : (
						<DocumentsTable documents={documents.data} />
					)}
				</CardContent>
			</Card>
			{documents.data && documents.data.length > 0 ? <PurgeRequestContainer /> : null}
		</div>
	);
}
