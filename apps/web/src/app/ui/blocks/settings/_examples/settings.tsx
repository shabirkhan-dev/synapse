"use client";

import { SettingsBlock } from "@rabtx/ui/blocks/settings";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Try the username "admin", the email taken@example.com, or deleting the account. */
export default function SettingsBlockExample() {
	return (
		<SettingsBlock
			headingLevel={3}
			email="ada@example.com"
			plan="Pro"
			defaultValues={{
				name: "Ada Lovelace",
				username: "ada",
				website: "https://example.com",
				bio: "Writing the first programs for an engine that does not exist yet.",
			}}
			onSave={async (values) => {
				await wait(800); // your API
				if (values.username === "admin") return { username: "That username is taken." };
			}}
			onChangeEmail={async (email) => {
				await wait(800); // your API: send a confirmation link
				if (email.toLowerCase() === "taken@example.com") return "That email is already in use.";
			}}
			onDeleteAccount={async () => {
				await wait(800); // your API
			}}
		/>
	);
}
