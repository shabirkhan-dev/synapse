import { Button } from "@synapse/ui/components/button";

import { RANGES } from "../constants/usage.constants";

export type RangePickerProps = { days: number; onChange: (days: number) => void };

/** The window, as a row of toggle buttons (the pressed one is the current range). */
export function RangePicker({ days, onChange }: RangePickerProps) {
	return (
		<div role="group" aria-label="Time range" className="flex gap-1">
			{RANGES.map((range) => (
				<Button
					key={range}
					size="sm"
					variant={range === days ? "secondary" : "ghost"}
					aria-pressed={range === days}
					onClick={() => onChange(range)}
				>
					Last {range} days
				</Button>
			))}
		</div>
	);
}
