import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

/** Manual activation: the arrows only move focus; Enter or Space selects. For panels that load. */
export default function TabsManual() {
	return (
		<Tabs defaultValue="logs" activationMode="manual" className="w-full max-w-md">
			<TabsList variant="underline" aria-label="Deployment">
				<TabsTrigger value="logs">Logs</TabsTrigger>
				<TabsTrigger value="metrics">Metrics</TabsTrigger>
				<TabsTrigger value="traces">Traces</TabsTrigger>
			</TabsList>
			<TabsContent value="logs" className="text-sm text-muted-foreground">
				Build and runtime logs.
			</TabsContent>
			<TabsContent value="metrics" className="text-sm text-muted-foreground">
				Requests, errors and latency.
			</TabsContent>
			<TabsContent value="traces" className="text-sm text-muted-foreground">
				Slow requests, span by span.
			</TabsContent>
		</Tabs>
	);
}
