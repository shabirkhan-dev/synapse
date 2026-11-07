import { Button } from "@rabtx/ui/button";
import { Tabs, TabsList, TabsTrigger, tabsSizes } from "@rabtx/ui/tabs";

/** 32, 40 and 48px, the heights of a Button, so a tab list and a button line up in a toolbar. */
export default function TabsSizes() {
	return (
		<div className="grid gap-4">
			{tabsSizes.map((size) => (
				<div key={size} className="flex items-center gap-3">
					<Tabs defaultValue="day">
						<TabsList size={size} aria-label={`Range, ${size}`}>
							<TabsTrigger value="day">Day</TabsTrigger>
							<TabsTrigger value="week">Week</TabsTrigger>
							<TabsTrigger value="month">Month</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button size={size} variant="secondary">
						Export
					</Button>
				</div>
			))}
		</div>
	);
}
