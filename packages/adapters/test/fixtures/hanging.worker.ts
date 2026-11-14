// Never answers: stands in for a PDF that takes forever to parse.
(globalThis as unknown as Worker).addEventListener("message", () => {
	for (;;) {
		// Busy forever, like a pathological file; only terminate() stops it.
	}
});
