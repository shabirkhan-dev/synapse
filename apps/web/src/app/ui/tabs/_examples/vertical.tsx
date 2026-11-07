import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

const SECTIONS = ["General", "Members", "Billing", "Integrations"];

/** Vertical: the list sits beside the panels and the up and down arrows move between tabs. */
export default function TabsVertical() {
	return (
		<div className="grid w-full max-w-lg gap-8">
			{(["segmented", "underline"] as const).map((variant) => (
				<Tabs key={variant} defaultValue="General" orientation="vertical">
					<TabsList variant={variant} aria-label={`Workspace, ${variant}`}>
						{SECTIONS.map((section) => (
							<TabsTrigger key={section} value={section}>
								{section}
							</TabsTrigger>
						))}
					</TabsList>
					{SECTIONS.map((section) => (
						<TabsContent key={section} value={section} className="text-sm text-muted-foreground">
							{section} settings for this workspace.
						</TabsContent>
					))}
				</Tabs>
			))}
		</div>
	);
}
