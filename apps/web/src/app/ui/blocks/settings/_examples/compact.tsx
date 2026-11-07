"use client";

import { SettingsBlock } from "@rabtx/ui/blocks/settings";

/** In a narrow column the sections become a scrolling row of tabs above the panel. */
export default function SettingsBlockCompact() {
	return (
		<div className="w-full max-w-sm">
			<SettingsBlock
				headingLevel={3}
				title="Preferences"
				description="A narrow column: the tabs sit on top."
				defaultSection="appearance"
				defaultValues={{ name: "Grace Hopper", username: "grace", theme: "dark" }}
			/>
		</div>
	);
}
