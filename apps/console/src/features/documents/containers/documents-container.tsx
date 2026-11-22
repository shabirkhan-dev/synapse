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
import { Checkbox } from "@synapse/ui/components/checkbox";
import { Label } from "@synapse/ui/components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@synapse/ui/components/tabs";
import { useState } from "react";

import { useCurrentUserQuery } from "@/features/auth";
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
	const documents = useDocumentsQuery({ fresh: true });
	const ingest = useIngestDocumentMutation();
	const upload = useUploadDocumentMutation();
	const webPage = useAddWebPageMutation();
	const me = useCurrentUserQuery();
	const inTeam = Boolean(me.data && me.data.organization.id !== me.data.id);
	const [onlyMe, setOnlyMe] = useState(false);
	// Only in a team: a personal organization has no one else to hide it from.
	const access = inTeam && onlyMe ? ("restricted" as const) : undefined;
	const withAccess = <T,>(input: T) => (access ? { ...input, access } : input);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Documents"
				{...(documents.data
					? {
							meta: `${documents.data.length} ${documents.data.length === 1 ? "document" : "documents"}`,
						}
					: {})}
			>
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
								onSubmit={(input) => upload.mutateAsync(withAccess(input))}
								onFileChange={upload.reset}
							/>
						</TabsContent>
						<TabsContent value="text" keepMounted className="pt-4">
							<IngestDocumentForm
								pending={ingest.isPending}
								error={ingest.error ? ingest.error.message : null}
								onSubmit={(input) => ingest.mutateAsync(withAccess(input))}
							/>
						</TabsContent>
						<TabsContent value="web" keepMounted className="pt-4">
							<AddWebPageForm
								pending={webPage.isPending}
								error={webPage.error ? webPage.error.message : null}
								onSubmit={(input) => webPage.mutateAsync(withAccess(input))}
							/>
						</TabsContent>
					</Tabs>
					{inTeam ? (
						<Label className="mt-5 flex items-start gap-2.5 border-t pt-4 font-normal">
							<Checkbox
								className="mt-0.5"
								checked={onlyMe}
								onCheckedChange={(checked) => setOnlyMe(checked)}
							/>
							<span className="flex flex-col gap-0.5">
								<span>Only me for now</span>
								<span className="text-xs text-muted-foreground">
									Owners and admins can still see it. Share it with others from its page.
								</span>
							</span>
						</Label>
					) : null}
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
