import { Card, CardDescription, CardHeader, CardTitle } from "@rabtx/ui/card";

const modes = [
	{ depth: "floating", radius: "default", label: "Floating" },
	{ depth: "flat", radius: "default", label: "Flat" },
	{ depth: "floating", radius: "sharp", label: "Sharp" },
	{ depth: "floating", radius: "round", label: "Round" },
] as const;

/** The same card under each depth and radius mode. Modes are attributes on any ancestor. */
export default function CardModes() {
	return modes.map((mode) => (
		<div key={mode.label} data-depth={mode.depth} data-radius={mode.radius}>
			<Card size="sm" className="w-36">
				<CardHeader>
					<CardTitle>{mode.label}</CardTitle>
					<CardDescription>
						{mode.depth}, {mode.radius}
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	));
}
