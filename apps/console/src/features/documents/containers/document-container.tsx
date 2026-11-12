"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api/api-error";

import { ChunkList } from "../components/chunk-list";
import { DeleteDocument } from "../components/delete-document";
import { CHUNK_PAGE_SIZE, DOCUMENTS_ROUTE } from "../constants/documents.constants";
import { useDeleteDocumentMutation } from "../hooks/mutations/use-delete-document-mutation";
import { useDocumentQuery } from "../hooks/queries/use-document-query";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const isLink = (source: string) => /^https?:\/\//i.test(source);

/** One document: what it is, its chunks with their versions, and deleting it. */
export function DocumentContainer({ id }: { id: string }) {
	const router = useRouter();
	const [offset, setOffset] = useState(0);
	const document = useDocumentQuery(id, offset);
	const remove = useDeleteDocumentMutation();

	const back = (
		<Link
			href={DOCUMENTS_ROUTE}
			className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
		>
			<HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.5} aria-hidden="true" />
			Documents
		</Link>
	);

	if (document.isPending) {
		return (
			<div className="flex flex-col gap-4">
				{back}
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
				{back}
				<Alert variant="destructive">
					<AlertTitle>
						{missing ? "This document does not exist" : "The document could not be loaded"}
					</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center gap-2">
						{missing
							? "It was deleted, or it belongs to another organization than the one you are in."
							: document.error.message}
						{missing ? null : (
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
				{back}
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<h1 className="text-lg font-semibold text-balance break-words">{detail.title}</h1>
						<p className="text-xs text-muted-foreground">
							Added{" "}
							<time dateTime={detail.createdAt}>
								{dateFormat.format(new Date(detail.createdAt))}
							</time>
							{" · "}
							{total === 1 ? "1 chunk" : `${total} chunks`}
						</p>
						{detail.source ? (
							<p className="text-xs break-all text-muted-foreground">
								Source:{" "}
								{isLink(detail.source) ? (
									<a
										href={detail.source}
										target="_blank"
										rel="noopener noreferrer"
										className="underline underline-offset-2 hover:text-foreground"
									>
										{detail.source}
									</a>
								) : (
									detail.source
								)}
							</p>
						) : null}
					</div>
					<DeleteDocument
						title={detail.title}
						chunkCount={total}
						deleting={remove.isPending}
						onDelete={() => remove.mutate(id, { onSuccess: () => router.replace(DOCUMENTS_ROUTE) })}
					/>
				</div>
				{remove.isError ? (
					<Alert variant="destructive">
						<AlertTitle>The document was not deleted</AlertTitle>
						<AlertDescription>{remove.error.message}</AlertDescription>
					</Alert>
				) : null}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Chunks</CardTitle>
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
