import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

export default function TabsPill() {
	return (
		<Tabs defaultValue="overview" className="w-full max-w-md">
			<TabsList variant="pill" aria-label="Project">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="activity">Activity</TabsTrigger>
				<TabsTrigger value="settings">Settings</TabsTrigger>
			</TabsList>
			<TabsContent value="overview" className="text-sm text-muted-foreground">
				A summary of the project.
			</TabsContent>
			<TabsContent value="activity" className="text-sm text-muted-foreground">
				Everything that happened this week.
			</TabsContent>
			<TabsContent value="settings" className="text-sm text-muted-foreground">
				Name, members and billing.
			</TabsContent>
		</Tabs>
	);
}
