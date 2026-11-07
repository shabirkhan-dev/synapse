import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ButtonLink } from "@rabtx/ui/button";

export default function ButtonLinkExample() {
	return (
		<ButtonLink href="/docs/ui" variant="outline">
			Read the introduction
			<HugeiconsIcon icon={ArrowRight01Icon} />
		</ButtonLink>
	);
}
