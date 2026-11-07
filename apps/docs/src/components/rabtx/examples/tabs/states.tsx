import { Tabs, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

/** A disabled tab is dimmed, skipped by the arrow keys and cannot be selected. */
export default function TabsStates() {
	return (
		<Tabs defaultValue="active">
			<TabsList aria-label="Members">
				<TabsTrigger value="active">Active</TabsTrigger>
				<TabsTrigger value="invited">Invited</TabsTrigger>
				<TabsTrigger value="removed" disabled>
					Removed
				</TabsTrigger>
				<TabsTrigger value="all">All</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
