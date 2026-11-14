(globalThis as unknown as Worker).addEventListener("message", () => {
	throw new Error("reader crashed");
});
