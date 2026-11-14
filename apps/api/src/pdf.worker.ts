// Entry of the thread that reads uploaded PDFs (`createWorkerPdfTextExtractor` in server.ts).
import { servePdfExtraction } from "@synapse/adapters/pdf";

servePdfExtraction();
