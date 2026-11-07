import { Button } from "@rabtx/ui/button";

/** The same buttons under each radius mode. Modes are attributes on any ancestor. */
export default function ButtonModes() {
	return (
		<>
			{(["sharp", "default", "round"] as const).map((radius) => (
				<div key={radius} data-radius={radius} className="flex items-center gap-2">
					<Button size="sm" variant="secondary">
						{radius}
					</Button>
					<Button size="icon" variant="outline" aria-label={`${radius} icon button`}>
						+
					</Button>
				</div>
			))}
			<div data-motion="off">
				<Button variant="ghost">Motion off</Button>
			</div>
		</>
	);
}
