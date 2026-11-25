"use client";

import { Layers01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LinkButton } from "@/components/shared/link-button";
import { PageHeader } from "@/components/shared/page-header";
import { useCurrentUserQuery } from "@/features/auth";
import { useMembersQuery } from "@/features/organizations";
import { ApiError } from "@/lib/api/api-error";

import { ChunkList } from "../components/chunk-list";
import { DeleteDocument } from "../components/delete-document";
import { DocumentAccessCard } from "../components/document-access-card";
import {
	askAboutDocumentRoute,
	CHUNK_PAGE_SIZE,
	DOCUMENTS_ROUTE,
} from "../constants/documents.constants";
import { useDeleteDocumentMutation } from "../hooks/mutations/use-delete-document-mutation";
import { useSetDocumentAccessMutation } from "../hooks/mutations/use-set-document-access-mutation";
import { useDocumentQuery } from "../hooks/queries/use-document-query";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const isLink = (source: string) => /^https?:\/\//i.test(source);

/** One document: what it is, its chunks with their versions, and deleting it. */
export function DocumentContainer({ id }: { id: string }) {
	const router = useRouter();
	const [offset, setOffset] = useState(0);
	const document = useDocumentQuery(id, offset);
	const remove = useDeleteDocumentMutation();
	const setAccess = useSetDocumentAccessMutation();
	const me = useCurrentUserQuery();
	// A personal organization's id is its user's: sharing only means something in a team.
	const teamId = me.data && me.data.organization.id !== me.data.id ? me.data.organization.id : null;
	const members = useMembersQuery(teamId);

	if (document.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<p role="status" className="text-xs text-muted-foreground">
					Loading the document…
				</p>
			</div>
		);
	}
	if (document.isError) {
		const missing = document.error instanceof ApiError && document.error.status === 404;
		return (
			<div className="flex flex-col gap-4">
				<Alert variant="destructive">
					<AlertTitle>
						{missing ? "This document does not exist" : "The document could not be loaded"}
					</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center gap-2">
						{missing
							? "It was deleted, or it belongs to another organization than the one you are in."
							: document.error.message}
						{missing ? (
							<LinkButton variant="outline" href={DOCUMENTS_ROUTE}>
								Back to Documents
							</LinkButton>
						) : (
							<Button size="sm" variant="outline" onClick={() => document.refetch()}>
								Try again
							</Button>
						)}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const detail = document.data;
	const { total } = detail.page;
	const last = Math.min(offset + detail.chunks.length, total);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<PageHeader
					title={detail.title}
					meta={total === 1 ? "1 chunk" : `${total} chunks`}
					actions={
						<div className="flex flex-wrap items-center gap-2">
							<LinkButton variant="outline" href={askAboutDocumentRoute(id)}>
								Ask about this document
							</LinkButton>
							<DeleteDocument
								title={detail.title}
								chunkCount={total}
								deleting={remove.isPending}
								onDelete={() =>
									remove.mutate(id, { onSuccess: () => router.replace(DOCUMENTS_ROUTE) })
								}
							/>
						</div>
					}
				>
					Added{" "}
					<time dateTime={detail.createdAt}>{dateFormat.format(new Date(detail.createdAt))}</time>
					{detail.source ? (
						<>
							{" from "}
							{isLink(detail.source) ? (
								<a
									href={detail.source}
									target="_blank"
									rel="noopener noreferrer"
									className="break-all text-link underline underline-offset-2"
								>
									{detail.source}
								</a>
							) : (
								<span className="break-all">{detail.source}</span>
							)}
						</>
					) : null}
					.
				</PageHeader>
				{remove.isError ? (
					<Alert variant="destructive">
						<AlertTitle>The document was not deleted</AlertTitle>
						<AlertDescription>{remove.error.message}</AlertDescription>
					</Alert>
				) : null}
			</div>

			{teamId ? (
				<DocumentAccessCard
					// Remount with the saved state after each change.
					key={`${detail.access}:${detail.sharedWith.join(",")}`}
					access={detail.access}
					sharedWith={detail.sharedWith}
					members={members.data ?? []}
					createdBy={detail.createdBy}
					canManage={detail.canManageAccess}
					saving={setAccess.isPending}
					error={setAccess.error ? setAccess.error.message : null}
					onSave={(change) => setAccess.mutate({ id, ...change })}
				/>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>
						<HugeiconsIcon icon={Layers01Icon} strokeWidth={1.75} aria-hidden="true" />
						Chunks
					</CardTitle>
					<CardDescription>
						The pieces search and answers read. New chunks are split by{" "}
						<code className="font-mono">{detail.current.chunkerVersion}</code> and embedded with{" "}
						<code className="font-mono break-all">{detail.current.embeddingModel}</code>.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<ChunkList chunks={detail.chunks} current={detail.current} />
					{total > CHUNK_PAGE_SIZE ? (
						<nav aria-label="Chunk pages" className="flex flex-wrap items-center gap-3">
							<Button
								variant="outline"
								disabled={offset === 0 || document.isFetching}
								onClick={() => setOffset(Math.max(0, offset - CHUNK_PAGE_SIZE))}
							>
								Previous
							</Button>
							<p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
								Chunks {offset + 1}–{last} of {total}
							</p>
							<Button
								variant="outline"
								disabled={last >= total || document.isFetching}
								onClick={() => setOffset(offset + CHUNK_PAGE_SIZE)}
							>
								Next
							</Button>
						</nav>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
