import { Tabs, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

function Pair({ label }: { label: string }) {
	return (
		<Tabs defaultValue="a">
			<TabsList variant="pill" aria-label={label}>
				<TabsTrigger value="a">{label}</TabsTrigger>
				<TabsTrigger value="b">Second</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}

/** The same tabs under each radius mode, flat, and with motion off. Modes are ancestor attributes. */
export default function TabsModes() {
	return (
		<div className="grid justify-items-start gap-3">
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius}>
					<Pair label={radius} />
				</div>
			))}
			<div data-depth="flat">
				<Pair label="Flat" />
			</div>
			<div data-motion="off">
				<Pair label="Motion off" />
			</div>
		</div>
	);
}
