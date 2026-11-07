import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

export default function TabsDefault() {
	return (
		<Tabs defaultValue="account" className="w-full max-w-md">
			<TabsList aria-label="Settings">
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
				<TabsTrigger value="notifications">Notifications</TabsTrigger>
			</TabsList>
			<TabsContent value="account" className="text-sm text-muted-foreground">
				Your name, email and avatar.
			</TabsContent>
			<TabsContent value="password" className="text-sm text-muted-foreground">
				Change your password and sign out of other devices.
			</TabsContent>
			<TabsContent value="notifications" className="text-sm text-muted-foreground">
				Choose what we email you about.
			</TabsContent>
		</Tabs>
	);
}
