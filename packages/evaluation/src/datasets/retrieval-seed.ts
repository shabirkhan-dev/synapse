import type { RetrievalDataset } from "./retrieval-dataset";

/**
 * Small support-desk corpus: keyword lookups (SKUs, codes), plain-language questions, and distractor
 * documents that share vocabulary with the right answer.
 */
export const RETRIEVAL_SEED: RetrievalDataset = {
	name: "retrieval-seed",
	version: 1,
	documents: [
		{
			id: "refunds",
			title: "Refund policy",
			content:
				"Customers can request a refund within 30 days of purchase by contacting support. Refunds are paid back to the original payment method within 5 business days. Shipping costs are not refundable unless the item arrived damaged.",
		},
		{
			id: "shipping",
			title: "Shipping times",
			content:
				"Standard shipping takes 3 to 5 business days. Express shipping arrives the next business day when ordered before 2 pm. We ship to Pakistan, the UAE and the UK. Tracking links are emailed when the parcel leaves the warehouse.",
		},
		{
			id: "warranty",
			title: "Hardware warranty",
			content:
				"All Synapse Hub devices (model SKU-4521) include a two-year limited warranty covering manufacturing defects. Water damage and drops are not covered. To claim, send the serial number and a photo of the fault.",
		},
		{
			id: "password",
			title: "Resetting your password",
			content:
				"Open the sign-in page and choose Forgot password. Enter the email on your account and we send a reset link valid for 60 minutes. If the link expired, request a new one. Two-factor codes are not affected by a reset.",
		},
		{
			id: "rate-limits",
			title: "API rate limits",
			content:
				"The public API allows 600 requests per minute per key. Exceeding the limit returns HTTP 429 with error code RATE_LIMITED and a Retry-After header. Batch endpoints count as one request.",
		},
		{
			id: "retention",
			title: "Data retention",
			content:
				"Uploaded documents are kept until you delete them. Deleted documents and their embeddings are removed within 24 hours. Audit logs are retained for 12 months for compliance.",
		},
		{
			id: "pricing",
			title: "Plans and pricing",
			content:
				"The Starter plan is free for one user. Team costs 12 dollars per seat per month, billed annually. Enterprise adds single sign-on, audit exports and a dedicated support engineer.",
		},
		{
			id: "office",
			title: "Office life",
			content:
				"Our office cat Biscuit sleeps on the printer most afternoons. Friday lunch is biryani. The Lahore office is open from 9 am to 6 pm.",
		},
		{
			id: "subscription-refunds",
			title: "Subscription refunds",
			content:
				"Annual plans can be cancelled for a prorated refund within the first 14 days. Monthly plans are not refunded; cancelling stops the next renewal. Refunds for subscriptions go back to the card on file.",
		},
		{
			id: "returns",
			title: "Returning an item",
			content:
				"Print the return label from your orders page and drop the parcel at any courier point. Returned items are inspected within 3 business days. Items must be unused and in the original box.",
		},
		{
			id: "api-keys",
			title: "Managing API keys",
			content:
				"Create keys under Settings, Developer. Each key has its own rate limit counter. Rotate keys every 90 days; a revoked key stops working immediately and cannot be restored.",
		},
		{
			id: "two-factor",
			title: "Two-factor authentication",
			content:
				"Turn on two-factor authentication with an authenticator app. Backup codes let you sign in if you lose your phone. Resetting your password does not disable two-factor.",
		},
	],
	cases: [
		{
			id: "q01",
			query: "how many days do I have to get a refund",
			relevant: ["refunds"],
			tags: ["paraphrase"],
		},
		{ id: "q02", query: "SKU-4521 warranty", relevant: ["warranty"], tags: ["keyword"] },
		{ id: "q03", query: "error RATE_LIMITED 429", relevant: ["rate-limits"], tags: ["keyword"] },
		{ id: "q04", query: "forgot password reset link", relevant: ["password"], tags: ["keyword"] },
		{
			id: "q05",
			query: "when will my express order arrive",
			relevant: ["shipping"],
			tags: ["paraphrase"],
		},
		{ id: "q06", query: "is water damage covered", relevant: ["warranty"], tags: ["paraphrase"] },
		{
			id: "q07",
			query: "how long are deleted documents kept",
			relevant: ["retention"],
			tags: ["paraphrase"],
		},
		{
			id: "q08",
			query: "price of the team plan per seat",
			relevant: ["pricing"],
			tags: ["keyword"],
		},
		{ id: "q09", query: "do you ship to the UAE", relevant: ["shipping"], tags: ["keyword"] },
		{
			id: "q10",
			query: "money back for damaged shipping",
			relevant: ["refunds"],
			tags: ["paraphrase"],
		},
		{ id: "q11", query: "single sign-on enterprise", relevant: ["pricing"], tags: ["keyword"] },
		{ id: "q12", query: "audit logs retention period", relevant: ["retention"], tags: ["keyword"] },
		{
			id: "q13",
			query: "cancel my annual subscription and get money back",
			relevant: ["subscription-refunds"],
			tags: ["distractor"],
		},
		{
			id: "q14",
			query: "how do I send a parcel back",
			relevant: ["returns"],
			tags: ["paraphrase", "distractor"],
		},
		{
			id: "q15",
			query: "lost my phone and cannot log in",
			relevant: ["two-factor"],
			tags: ["paraphrase", "distractor"],
		},
		{
			id: "q16",
			query: "too many requests error",
			relevant: ["rate-limits"],
			tags: ["paraphrase", "distractor"],
		},
		{
			id: "q17",
			query: "rotate an api key",
			relevant: ["api-keys"],
			tags: ["keyword", "distractor"],
		},
		{
			id: "q18",
			query: "refund for an item that arrived damaged",
			relevant: ["refunds"],
			tags: ["distractor"],
		},
	],
};
