import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ActivityContainer } from "@/features/activity";
import { ActivityTable } from "@/features/activity/components/activity-table";
import { ApprovalsContainer } from "@/features/oversight";
import { ApprovalsList } from "@/features/oversight/components/approvals-list";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const me = { id: "u1", email: "ada@example.com", emailVerifiedAt: null };
const approval = (id: string, requestedBy: string | null) => ({
	id,
	action: "rag.purge-documents",
	summary: "Delete all 3 of your documents and their chunks",
	requestedBy,
	status: "pending" as const,
	reason: null,
	decidedBy: null,
	decidedAt: null,
	createdAt: "2026-11-12T10:00:00Z",
});

describe("ApprovalsList", () => {
	test("labels the action, says who asked, and passes an optional reason when rejecting", () => {
		const onApprove = mock();
		const onReject = mock();
		render(
			<ApprovalsList
				approvals={[approval("a1", "u1"), approval("a2", "u2")]}
				currentUserId="u1"
				busyId={null}
				onApprove={onApprove}
				onReject={onReject}
			/>,
		);
		expect(screen.getAllByText("Delete all documents")).toHaveLength(2);
		expect(screen.getByText(/Requested by you/)).toBeDefined();
		expect(screen.getByText(/Requested by a member/)).toBeDefined();

		fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0] as HTMLElement);
		expect(onApprove).toHaveBeenCalledWith("a1");

		const reasons = screen.getAllByLabelText("Reason for rejecting");
		fireEvent.change(reasons[1] as HTMLElement, { target: { value: "  keep them  " } });
		fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[1] as HTMLElement);
		expect(onReject).toHaveBeenCalledWith("a2", "keep them");
		fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[0] as HTMLElement);
		expect(onReject).toHaveBeenLastCalledWith("a1", undefined);
	});
});

describe("ApprovalsContainer (mocked API)", () => {
	test("approving runs the action and says what it did; the list refreshes", async () => {
		signedIn();
		let pending = [approval("a1", "u1")];
		const calls = mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me);
			if (call.url.endsWith("/approve")) {
				pending = [];
				return ok({
					approval: { ...approval("a1", "u1"), status: "approved" },
					outcome: { status: "done", approvalId: "a1", result: { deleted: 3 } },
				});
			}
			return ok(pending);
		});
		renderWithQuery(<ApprovalsContainer />);
		await screen.findByText(/Requested by you/);
		fireEvent.click(screen.getByRole("button", { name: "Approve" }));

		await screen.findByText("Approved. 3 documents deleted.");
		await screen.findByText("Nothing is waiting for a decision.");
		const approveCall = calls.find((call) => call.url.endsWith("/oversight/approvals/a1/approve"));
		expect(approveCall?.method).toBe("POST");
	});

	test("a member trying to decide is told only admins and owners can", async () => {
		signedIn();
		mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me);
			if (call.url.endsWith("/reject")) {
				return failure(
					403,
					"OVERSIGHT_FORBIDDEN",
					"Only an admin or owner of this organization can decide approval requests",
				);
			}
			return ok([approval("a1", "u1")]);
		});
		renderWithQuery(<ApprovalsContainer />);
		await screen.findByText(/Requested by you/);
		fireEvent.click(screen.getByRole("button", { name: "Reject" }));
		await screen.findByText("Only admins and owners decide");
		expect(screen.getByText(/can decide approval requests/)).toBeDefined();
	});

	test("an empty queue says so", async () => {
		signedIn();
		mockFetch((call) => (call.url.endsWith("/auth/me") ? ok(me) : ok([])));
		renderWithQuery(<ApprovalsContainer />);
		await screen.findByText("Nothing is waiting for a decision.");
	});
});

const event = (
	id: string,
	action: string,
	actorId: string,
	data: Record<string, unknown> = {},
) => ({
	id,
	actorId,
	action,
	subjectType: "document",
	subjectId: null,
	requestId: null,
	data,
	createdAt: "2026-11-12T10:00:00Z",
});

describe("ActivityTable", () => {
	test("plain-word actions, you / a member / Synapse, and one detail per event", () => {
		render(
			<ActivityTable
				currentUserId="u1"
				events={[
					event("e1", "rag.document.ingested", "u1", { title: "Refund policy" }),
					event("e2", "oversight.approval.decided", "u2", { approved: false }),
					event("e3", "rag.documents.purged", "system", { deleted: 3 }),
					event("e4", "something.new", "u1", { question: "<b>bold?</b>" }),
				]}
			/>,
		);
		const rows = screen.getAllByRole("row").map((row) => row.textContent ?? "");
		expect(rows[1]).toContain("You");
		expect(rows[1]).toContain("Added a document");
		expect(rows[1]).toContain("Refund policy");
		expect(rows[2]).toContain("A member");
		expect(rows[2]).toContain("Rejected");
		expect(rows[3]).toContain("Synapse");
		expect(rows[3]).toContain("3 deleted");
		expect(rows[4]).toContain("something.new");
		expect(document.querySelector("b")).toBeNull();
	});
});

describe("ActivityContainer (mocked API)", () => {
	test("asks for the latest 50 events and shows them", async () => {
		signedIn();
		const calls = mockFetch((call) =>
			call.url.endsWith("/auth/me") ? ok(me) : ok([event("e1", "auth.user.signed_in", "u1")]),
		);
		renderWithQuery(<ActivityContainer />);
		await screen.findByText("Signed in");
		expect(calls.some((call) => call.url.endsWith("/audit/events?limit=50"))).toBe(true);
	});

	test("a failed load can be retried", async () => {
		signedIn();
		let fail = true;
		mockFetch((call) => {
			if (call.url.endsWith("/auth/me")) return ok(me);
			return fail ? failure(500, "INTERNAL_SERVER_ERROR", "Internal server error") : ok([]);
		});
		renderWithQuery(<ActivityContainer />);
		await screen.findByText("Activity could not be loaded");
		fail = false;
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitFor(() => expect(screen.getByText("Nothing recorded yet.")).toBeDefined());
	});
});

describe("PurgeRequest", () => {
	// Closing waits for Base UI's exit animation, which happy-dom never runs: the e2e suite checks it.
	test("cancelling files nothing; confirming files the request once", async () => {
		const onRequest = mock();
		const { PurgeRequest } = await import("@/features/oversight/components/purge-request");
		render(<PurgeRequest onRequest={onRequest} pending={false} requested={false} error={null} />);

		fireEvent.click(screen.getByRole("button", { name: "Delete all documents…" }));
		fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
		expect(onRequest).not.toHaveBeenCalled();

		cleanup();
		render(<PurgeRequest onRequest={onRequest} pending={false} requested={false} error={null} />);
		fireEvent.click(screen.getByRole("button", { name: "Delete all documents…" }));
		fireEvent.click(await screen.findByRole("button", { name: "Ask for approval" }));
		expect(onRequest).toHaveBeenCalledTimes(1);
	});

	test("once requested, points to the approvals page", async () => {
		const { PurgeRequest } = await import("@/features/oversight/components/purge-request");
		render(<PurgeRequest onRequest={() => {}} pending={false} requested error={null} />);
		expect(screen.getByRole("link", { name: "see Approvals" }).getAttribute("href")).toBe(
			"/approvals",
		);
	});
});
