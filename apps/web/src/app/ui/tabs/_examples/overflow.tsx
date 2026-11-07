import { Tabs, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August"];

/** A row longer than its box scrolls sideways; focusing a tab scrolls it into view. */
export default function TabsOverflow() {
	return (
		<Tabs defaultValue="January" className="w-full max-w-xs">
			<TabsList variant="underline" aria-label="Month">
				{MONTHS.map((month) => (
					<TabsTrigger key={month} value={month}>
						{month}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
