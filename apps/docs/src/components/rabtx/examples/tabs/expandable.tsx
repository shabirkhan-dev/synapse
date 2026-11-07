import {
	Calendar03Icon,
	Home01Icon,
	InboxIcon,
	Search01Icon,
	Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

const TABS = [
	{ value: "home", label: "Home", icon: Home01Icon },
	{ value: "inbox", label: "Inbox", icon: InboxIcon },
	{ value: "calendar", label: "Calendar", icon: Calendar03Icon },
	{ value: "search", label: "Search", icon: Search01Icon },
	{ value: "settings", label: "Settings", icon: Settings01Icon },
];

/** Icon tabs: the selected one opens to show its label. The label is always the tab's name. */
export default function TabsExpandable() {
	return (
		<Tabs defaultValue="home" className="items-center">
			<TabsList variant="expandable" aria-label="Sections">
				{TABS.map((tab) => (
					<TabsTrigger key={tab.value} value={tab.value} icon={<HugeiconsIcon icon={tab.icon} />}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
			{TABS.map((tab) => (
				<TabsContent key={tab.value} value={tab.value} className="text-sm text-muted-foreground">
					{tab.label} goes here.
				</TabsContent>
			))}
		</Tabs>
	);
}
