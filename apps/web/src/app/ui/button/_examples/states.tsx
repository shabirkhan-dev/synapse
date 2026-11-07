"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ButtonState, StatefulButton } from "@rabtx/ui/button";
import { useState } from "react";

/** Loading, then the outcome, then back to idle. */
function run(set: (state: ButtonState) => void, outcome: ButtonState) {
	set("loading");
	setTimeout(() => set(outcome), 1400);
	setTimeout(() => set("idle"), 3200);
}

export default function ButtonStates() {
	const [state, setState] = useState<ButtonState>("idle");
	const [failed, setFailed] = useState<ButtonState>("idle");

	return (
		<>
			<StatefulButton
				state={state}
				icon={<HugeiconsIcon icon={ArrowRight01Icon} />}
				onClick={() => run(setState, "success")}
			>
				Save changes
			</StatefulButton>
			<StatefulButton
				variant="secondary"
				state={failed}
				errorText="Try again"
				onClick={() => run(setFailed, "error")}
			>
				Publish
			</StatefulButton>
		</>
	);
}
