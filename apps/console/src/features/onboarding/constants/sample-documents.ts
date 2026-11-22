/**
 * Three short policies of a made-up outdoor shop, so a new workspace has something to ask about.
 * Markdown with headings, so their chunks carry a heading path like real documents do.
 */
export const SAMPLE_DOCUMENTS = [
	{
		title: "Sample · Returns and refunds",
		content: `# Returns and refunds

Lumen Outfitters accepts returns within 30 days of delivery.

## What can be returned
Unused items in their original packaging. Worn footwear and opened camping fuel cannot be returned.

## Refunds
Refunds go back to the original payment method within 5 business days of the return arriving.
Return shipping is free for exchanges; for refunds a 6 EUR label is deducted.`,
	},
	{
		title: "Sample · Shipping and delivery",
		content: `# Shipping and delivery

Orders placed before 14:00 ship the same working day from the warehouse in Utrecht.

## Delivery times
Standard delivery takes 2–4 working days in the EU. Express delivery arrives the next working day
for 9 EUR.

## Free shipping
Orders over 75 EUR ship free within the EU. Outside the EU, duties are paid by the customer.`,
	},
	{
		title: "Sample · Product warranty",
		content: `# Product warranty

Every Lumen Outfitters product has a 2-year warranty against manufacturing defects.

## Tents and backpacks
Tents and backpacks carry a lifetime warranty on seams and zips. Damage from misuse is not covered.

## How to claim
Email support@lumen.example with your order number and a photo of the defect. Most claims are
answered within 2 working days.`,
	},
] as const;

/** A question the samples answer, for the Chat step. */
export const SAMPLE_QUESTION = "How long do customers have to return an item?";
