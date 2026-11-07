import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { loadConfig } from "../src/config";
import { SynapseError } from "../src/errors";

const schema = z.object({
	PORT: z.coerce.number().int().positive().default(8000),
	NAME: z.string().min(1),
});

describe("loadConfig", () => {
	test("parses, coerces and applies defaults", () => {
		expect(loadConfig(schema, { NAME: "api" })).toEqual({ PORT: 8000, NAME: "api" });
		expect(loadConfig(schema, { NAME: "api", PORT: "9000" })).toEqual({ PORT: 9000, NAME: "api" });
	});

	test("treats empty strings as unset", () => {
		expect(loadConfig(schema, { NAME: "api", PORT: "" }).PORT).toBe(8000);
	});

	test("throws CONFIG_INVALID listing every failing key", () => {
		try {
			loadConfig(schema, { PORT: "-1" });
			throw new Error("expected loadConfig to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(SynapseError);
			const synapseError = error as SynapseError;
			expect(synapseError.code).toBe("CONFIG_INVALID");
			expect(synapseError.message).toContain("PORT:");
			expect(synapseError.message).toContain("NAME:");
			expect(synapseError.details).toHaveLength(2);
		}
	});
});
