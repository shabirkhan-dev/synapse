import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Bun's own web streams: `fetch`/`Response` bodies are native streams, and mixing them with
// happy-dom's stream classes breaks `pipeThrough` (the chat reads a streamed response).
const native = {
	ReadableStream: globalThis.ReadableStream,
	WritableStream: globalThis.WritableStream,
	TransformStream: globalThis.TransformStream,
	TextDecoderStream: globalThis.TextDecoderStream,
	TextEncoderStream: globalThis.TextEncoderStream,
};

// A browser-like DOM (window, document, sessionStorage) for component and client tests.
GlobalRegistrator.register({ url: "http://localhost:3000/" });

Object.assign(globalThis, native);
