/** A minimal valid PDF, one page per string (Helvetica, ASCII text), built without a library. */
export function makePdf(pages: string[]): Uint8Array {
	const objects: string[] = [];
	const pageIds = pages.map((_, index) => 4 + index * 2);
	objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
	const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
	objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
	objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
	for (const [index, text] of pages.entries()) {
		const pageId = pageIds[index] ?? 0;
		const escaped = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
		const stream = text ? `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET` : "";
		objects[pageId] =
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
			`/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
		objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
	}
	let body = "%PDF-1.4\n";
	const offsets: number[] = [];
	for (let id = 1; id < objects.length; id++) {
		offsets[id] = body.length;
		body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
	}
	const xref = body.length;
	body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
	for (let id = 1; id < objects.length; id++) {
		body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
	}
	body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return new TextEncoder().encode(body);
}
