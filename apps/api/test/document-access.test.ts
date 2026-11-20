import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";
const PASSPHRASE = ["a", "long", "test", "passphrase"].join(" ");

async function request(app: App, method: string, path: string, token: string, body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

async function signUp(app: App, email: string) {
	const response = await app.request(`${base}/auth/sign-up`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password: PASSPHRASE }),
	});
	const { data } = await response.json();
	return { userId: data.user.id as string, token: data.tokens.accessToken as string };
}

/** Ada owns a team; Bob and Cy are members. Returns each one's token inside the team. */
async function team(app: App) {
	const ada = await signUp(app, "ada@example.com");
	const bob = await signUp(app, "bob@example.com");
	const cy = await signUp(app, "cy@example.com");
	const orgId = (await request(app, "POST", "/organizations", ada.token, { name: "Support" })).body
		.data.id as string;
	for (const email of ["bob@example.com", "cy@example.com"]) {
		// oxlint-disable-next-line no-await-in-loop -- members one at a time
		await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
			email,
			role: "member",
		});
	}
	const inTeam = async (person: { userId: string; token: string }) => ({
		userId: person.userId,
		token: (
			await request(app, "POST", "/auth/switch-organization", person.token, {
				organizationId: orgId,
			})
		).body.data.accessToken as string,
	});
	return { orgId, ada: await inTeam(ada), bob: await inTeam(bob), cy: await inTeam(cy) };
}

const SALARIES = "Salaries: the salary bands for engineers are listed here.";

/** Titles a reader finds for a keyword and a vector search. */
async function found(app: App, token: string, query: string) {
	const titles = new Set<string>();
	for (const mode of ["keyword", "vector", "hybrid"] as const) {
		// oxlint-disable-next-line no-await-in-loop -- one mode at a time
		const result = await request(app, "POST", "/rag/query", token, {
			query,
			answer: false,
			mode,
			topK: 10,
		});
		expect(result.status).toBe(200);
		for (const match of result.body.data.matches) titles.add(match.documentTitle);
	}
	return [...titles].toSorted();
}

describe("document access (ADR-0008)", () => {
	test("a restricted document is invisible to members it is not shared with, on every path", async () => {
		const { app } = buildTestApp();
		const { ada, bob, cy } = await team(app);
		const salaries = await request(app, "POST", "/rag/documents", bob.token, {
			title: "Salaries",
			content: SALARIES,
			access: "restricted",
		});
		expect(salaries.status).toBe(201);
		expect(salaries.body.data).toMatchObject({ access: "restricted", createdBy: bob.userId });
		await request(app, "POST", "/rag/documents", bob.token, {
			title: "Handbook",
			content: "Handbook: engineers follow the salary review in March.",
		});
		const id = salaries.body.data.id as string;

		// Cy (a member, not given access): no list entry, no detail, no search hit, no hint.
		const list = await request(app, "GET", "/rag/documents", cy.token);
		expect(list.body.data.map((d: { title: string }) => d.title)).toEqual(["Handbook"]);
		const detail = await request(app, "GET", `/rag/documents/${id}`, cy.token);
		expect(detail.status).toBe(404);
		expect(await found(app, cy.token, "salary bands engineers")).toEqual(["Handbook"]);
		expect((await request(app, "DELETE", `/rag/documents/${id}`, cy.token)).status).toBe(404);
		expect(
			(
				await request(app, "PUT", `/rag/documents/${id}/access`, cy.token, {
					access: "organization",
				})
			).status,
		).toBe(404);

		// Bob (who added it) and Ada (owner) read it; both may manage it.
		expect(await found(app, bob.token, "salary bands engineers")).toEqual(["Handbook", "Salaries"]);
		const asAda = await request(app, "GET", `/rag/documents/${id}`, ada.token);
		expect(asAda.body.data).toMatchObject({ access: "restricted", canManageAccess: true });
		expect((await request(app, "GET", "/rag/documents", ada.token)).body.data).toHaveLength(2);
	});

	test("sharing lets a member read and search it but not manage or delete it; opening it shows it to all", async () => {
		const { app } = buildTestApp();
		const { ada, bob, cy } = await team(app);
		const id = (
			await request(app, "POST", "/rag/documents", bob.token, {
				title: "Salaries",
				content: SALARIES,
				access: "restricted",
			})
		).body.data.id as string;

		const stranger = crypto.randomUUID();
		const shared = await request(app, "PUT", `/rag/documents/${id}/access`, bob.token, {
			access: "restricted",
			userIds: [cy.userId, stranger],
		});
		expect(shared.status).toBe(200);
		// People outside the organization are dropped.
		expect(shared.body.data).toEqual({ access: "restricted", sharedWith: [cy.userId] });

		const asCy = await request(app, "GET", `/rag/documents/${id}`, cy.token);
		expect(asCy.body.data).toMatchObject({ sharedWith: [cy.userId], canManageAccess: false });
		expect(await found(app, cy.token, "salary bands")).toEqual(["Salaries"]);
		const change = await request(app, "PUT", `/rag/documents/${id}/access`, cy.token, {
			access: "organization",
		});
		expect(change.status).toBe(403);
		expect(change.body.error.code).toBe("RAG_DOCUMENT_ACCESS_FORBIDDEN");
		expect((await request(app, "DELETE", `/rag/documents/${id}`, cy.token)).status).toBe(403);

		// Ada (owner) opens it to the organization: shares are cleared and everyone reads it.
		const opened = await request(app, "PUT", `/rag/documents/${id}/access`, ada.token, {
			access: "organization",
			userIds: [cy.userId],
		});
		expect(opened.body.data).toEqual({ access: "organization", sharedWith: [] });
		expect((await request(app, "GET", `/rag/documents/${id}`, cy.token)).status).toBe(200);
		expect((await request(app, "DELETE", `/rag/documents/${id}`, cy.token)).status).toBe(200);
	});

	test("adding text that only exists in a restricted document is refused without revealing it", async () => {
		const { app } = buildTestApp();
		const { bob, cy } = await team(app);
		await request(app, "POST", "/rag/documents", bob.token, {
			title: "Salaries",
			content: SALARIES,
			access: "restricted",
		});
		const again = await request(app, "POST", "/rag/documents", cy.token, {
			title: "My copy",
			content: SALARIES,
		});
		expect(again.status).toBe(409);
		expect(again.body.error.code).toBe("RAG_DUPLICATE_OF_RESTRICTED");
		expect(JSON.stringify(again.body)).not.toContain("Salaries");
		// Bob, who can read it, gets the existing document back as before.
		const mine = await request(app, "POST", "/rag/documents", bob.token, {
			title: "Again",
			content: SALARIES,
		});
		expect(mine.status).toBe(200);
		expect(mine.body.data.title).toBe("Salaries");
	});

	test("access changes are audited", async () => {
		const { app, auditEvents } = buildTestApp();
		const { bob, cy } = await team(app);
		const id = (
			await request(app, "POST", "/rag/documents", bob.token, {
				title: "Salaries",
				content: SALARIES,
				access: "restricted",
			})
		).body.data.id as string;
		await request(app, "PUT", `/rag/documents/${id}/access`, bob.token, {
			access: "restricted",
			userIds: [cy.userId],
		});
		expect(
			auditEvents.events.find((event) => event.action === "rag.document.access_changed"),
		).toMatchObject({
			actorId: bob.userId,
			subjectId: id,
			data: { access: "restricted", sharedWith: [cy.userId] },
		});
	});
});
