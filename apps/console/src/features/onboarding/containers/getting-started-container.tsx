"use client";

import { useCurrentUserQuery } from "@/features/auth";
import { CHAT_ROUTE, useConversationsQuery } from "@/features/chat";
import { useDocumentsQuery } from "@/features/documents";

import { GettingStarted } from "../components/getting-started";
import { useAddSampleDocumentsMutation } from "../hooks/mutations/use-add-sample-documents-mutation";
import { useOnboardingProgress } from "../hooks/use-onboarding-progress";

/**
 * The Get started card on a new workspace: shown until all three steps are done or it is hidden.
 * Steps are read from what exists (documents, conversations), plus the Playground visit.
 */
export function GettingStartedContainer() {
	const me = useCurrentUserQuery();
	const documents = useDocumentsQuery();
	const conversations = useConversationsQuery();
	const addSamples = useAddSampleDocumentsMutation();
	const { progress, update } = useOnboardingProgress(me.data?.organization.id ?? null);

	if (!me.data || !documents.data || !conversations.data || progress.dismissed) return null;
	const hasDocuments = documents.data.length > 0;
	const hasAskedInChat = conversations.data.length > 0;
	if (hasDocuments && hasAskedInChat && progress.triedPlayground) return null;

	return (
		<GettingStarted
			hasDocuments={hasDocuments}
			hasAskedInChat={hasAskedInChat}
			triedPlayground={progress.triedPlayground}
			adding={addSamples.isPending}
			error={addSamples.isError ? addSamples.error.message : null}
			chatHref={CHAT_ROUTE}
			onAddSamples={() => addSamples.mutate()}
			onOpenPlayground={() => update({ triedPlayground: true })}
			onHide={() => update({ dismissed: true })}
		/>
	);
}
