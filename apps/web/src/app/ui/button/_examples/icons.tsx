import { Add01Icon, ArrowRight01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";

export default function ButtonIcons() {
	return (
		<>
			<Button variant="secondary">
				<HugeiconsIcon icon={Add01Icon} />
				New company
			</Button>
			<Button>
				Continue
				<HugeiconsIcon icon={ArrowRight01Icon} />
			</Button>
			<Button size="icon" variant="outline" aria-label="Settings">
				<HugeiconsIcon icon={Settings01Icon} />
			</Button>
		</>
	);
}
