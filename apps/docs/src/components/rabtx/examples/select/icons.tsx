import { ComputerIcon, Globe02Icon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Select, SelectItem } from "@rabtx/ui/select";

export default function SelectIcons() {
	return (
		<div className="grid w-64 gap-3">
			<Select
				aria-label="Language"
				defaultValue="en"
				leadingIcon={<HugeiconsIcon icon={Globe02Icon} />}
			>
				<SelectItem value="en">English</SelectItem>
				<SelectItem value="es">Español</SelectItem>
				<SelectItem value="ja">日本語</SelectItem>
			</Select>
			<Select aria-label="Theme" defaultValue="system">
				<SelectItem value="light" icon={<HugeiconsIcon icon={Sun03Icon} />}>
					Light
				</SelectItem>
				<SelectItem value="dark" icon={<HugeiconsIcon icon={Moon02Icon} />}>
					Dark
				</SelectItem>
				<SelectItem value="system" icon={<HugeiconsIcon icon={ComputerIcon} />}>
					System
				</SelectItem>
			</Select>
		</div>
	);
}
