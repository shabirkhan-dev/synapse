import {
	File01Icon,
	Folder01Icon,
	Home01Icon,
	Logout01Icon,
	Mail01Icon,
	Moon02Icon,
	PaintBoardIcon,
	PlusSignIcon,
	Settings01Icon,
	Sun03Icon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { CommandItem } from "@rabtx/ui/blocks/command";

const icon = (glyph: IconSvgElement) => <HugeiconsIcon icon={glyph} size={16} strokeWidth={1.5} />;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Commands for the examples. `run` reports which one ran. */
export function exampleCommands(run: (label: string) => void): CommandItem[] {
	const select = (item: CommandItem) => run(item.label);
	return [
		{
			id: "home",
			label: "Go to Home",
			group: "Navigation",
			icon: icon(Home01Icon),
			shortcut: ["G", "H"],
			onSelect: select,
		},
		{
			id: "inbox",
			label: "Open inbox",
			group: "Navigation",
			icon: icon(Mail01Icon),
			badge: "3",
			badgeTone: "accent",
			shortcut: ["G", "I"],
			onSelect: select,
		},
		{
			id: "profile",
			label: "Your profile",
			group: "Navigation",
			icon: icon(UserIcon),
			keywords: ["account", "me"],
			onSelect: select,
		},
		{
			id: "new-file",
			label: "New file",
			group: "Actions",
			icon: icon(File01Icon),
			shortcut: ["⌘", "N"],
			onSelect: select,
		},
		{
			id: "new-project",
			label: "New project",
			group: "Actions",
			icon: icon(PlusSignIcon),
			badge: "New",
			badgeTone: "success",
			onSelect: select,
		},
		{
			id: "archive",
			label: "Archive project",
			group: "Actions",
			icon: icon(Folder01Icon),
			description: "Needs the owner role",
			disabled: true,
		},
		{
			id: "theme",
			label: "Change theme",
			group: "Preferences",
			icon: icon(PaintBoardIcon),
			placeholder: "Choose a theme…",
			items: [
				{ id: "theme-light", label: "Light", icon: icon(Sun03Icon), onSelect: select },
				{ id: "theme-dark", label: "Dark", icon: icon(Moon02Icon), onSelect: select },
				{
					id: "theme-system",
					label: "Match the system",
					icon: icon(Settings01Icon),
					keywords: ["auto"],
					onSelect: select,
				},
			],
		},
		{
			id: "team",
			label: "Switch team",
			group: "Preferences",
			icon: icon(UserIcon),
			description: "Loads from your API",
			items: async () => {
				await wait(900); // your API
				return ["Design", "Platform", "Growth"].map((name) => ({
					id: `team-${name.toLowerCase()}`,
					label: name,
					group: "Teams",
					onSelect: select,
				}));
			},
		},
		{
			id: "settings",
			label: "Settings",
			group: "Preferences",
			icon: icon(Settings01Icon),
			keywords: ["preferences", "options"],
			shortcut: ["⌘", ","],
			onSelect: select,
		},
		{
			id: "sign-out",
			label: "Sign out",
			group: "Account",
			icon: icon(Logout01Icon),
			onSelect: select,
		},
	];
}
