import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";

export default function ButtonSizes() {
	return (
		<>
			<Button size="sm">Small</Button>
			<Button size="md">Medium</Button>
			<Button size="lg">Large</Button>
			<Button size="icon" variant="secondary" aria-label="Settings">
				<HugeiconsIcon icon={Settings01Icon} />
			</Button>
		</>
	);
}
