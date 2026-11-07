import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

export default function TabsUnderline() {
	return (
		<Tabs defaultValue="all" className="w-full max-w-md">
			<TabsList variant="underline" aria-label="Issues">
				<TabsTrigger value="all">All</TabsTrigger>
				<TabsTrigger value="open">Open</TabsTrigger>
				<TabsTrigger value="closed">Closed</TabsTrigger>
			</TabsList>
			<TabsContent value="all" className="text-sm text-muted-foreground">
				128 issues
			</TabsContent>
			<TabsContent value="open" className="text-sm text-muted-foreground">
				24 open issues
			</TabsContent>
			<TabsContent value="closed" className="text-sm text-muted-foreground">
				104 closed issues
			</TabsContent>
		</Tabs>
	);
}
