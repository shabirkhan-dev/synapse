import { Analytics01Icon, Home01Icon, Notification01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tabs, TabsList, TabsTrigger, tabsVariants } from "@rabtx/ui/tabs";

/** The same three tabs in every variant. Expandable shows only the selected tab's label. */
export default function TabsVariants() {
	return (
		<div className="grid w-full max-w-md gap-6">
			{tabsVariants.map((variant) => (
				<Tabs key={variant} defaultValue="home">
					<TabsList variant={variant} aria-label={variant}>
						<TabsTrigger value="home" icon={<HugeiconsIcon icon={Home01Icon} />}>
							Home
						</TabsTrigger>
						<TabsTrigger value="stats" icon={<HugeiconsIcon icon={Analytics01Icon} />}>
							Stats
						</TabsTrigger>
						<TabsTrigger value="alerts" icon={<HugeiconsIcon icon={Notification01Icon} />}>
							Alerts
						</TabsTrigger>
					</TabsList>
				</Tabs>
			))}
		</div>
	);
}
