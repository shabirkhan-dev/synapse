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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@synapse/ui/components/tabs";

import { PurgeRequestContainer } from "@/features/oversight";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

import { AddWebPageForm } from "../components/add-web-page-form";
import { DocumentsTable } from "../components/documents-table";
import { IngestDocumentForm } from "../components/ingest-document-form";
import { UploadDocumentForm } from "../components/upload-document-form";
import { useAddWebPageMutation } from "../hooks/mutations/use-add-web-page-mutation";
import { useIngestDocumentMutation } from "../hooks/mutations/use-ingest-document-mutation";
import { useUploadDocumentMutation } from "../hooks/mutations/use-upload-document-mutation";
import { useDocumentsQuery } from "../hooks/queries/use-documents-query";

/** Documents page: the add form and the list, with loading, error and empty states. */
export function DocumentsContainer() {
	const documents = useDocumentsQuery();
	const ingest = useIngestDocumentMutation();
	const upload = useUploadDocumentMutation();
	const webPage = useAddWebPageMutation();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Documents">
				What answers and chat search draw on. Adding text chunks and embeds it.
			</PageHeader>
			<Card>
				<CardHeader>
					<CardTitle>Add documents</CardTitle>
					<CardDescription>
						Upload files, paste text or add a web page; the same text twice is stored once.
					</CardDescription>
				</CardHeader>
				{/* One way at a time; every panel stays mounted, so switching keeps what was typed. */}
				<CardContent>
					<Tabs defaultValue="files">
						<TabsList aria-label="How to add">
							<TabsTrigger value="files">Upload files</TabsTrigger>
							<TabsTrigger value="text">Paste text</TabsTrigger>
							<TabsTrigger value="web">Web page</TabsTrigger>
						</TabsList>
						<TabsContent value="files" keepMounted className="pt-4">
							<UploadDocumentForm
								pending={upload.isPending}
								error={upload.error ? upload.error.message : null}
								onSubmit={(input) => upload.mutateAsync(input)}
								onFileChange={upload.reset}
							/>
						</TabsContent>
						<TabsContent value="text" keepMounted className="pt-4">
							<IngestDocumentForm
								pending={ingest.isPending}
								error={ingest.error ? ingest.error.message : null}
								onSubmit={(input) => ingest.mutateAsync(input)}
							/>
						</TabsContent>
						<TabsContent value="web" keepMounted className="pt-4">
							<AddWebPageForm
								pending={webPage.isPending}
								error={webPage.error ? webPage.error.message : null}
								onSubmit={(input) => webPage.mutateAsync(input)}
							/>
						</TabsContent>
					</Tabs>
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
