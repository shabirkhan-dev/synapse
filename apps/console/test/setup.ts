import { GlobalRegistrator } from "@happy-dom/global-registrator";

// A browser-like DOM (window, document, sessionStorage) for component and client tests.
GlobalRegistrator.register({ url: "http://localhost:3000/" });
