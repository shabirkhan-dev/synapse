import { SegmentedControl } from "@/components/shared/segmented-control";

import { RANGES } from "../constants/usage.constants";

export type RangePickerProps = { days: number; onChange: (days: number) => void };

const OPTIONS = RANGES.map((days) => ({ value: days, label: `Last ${days} days` }));

/** The window: one of a few ranges, the current one raised. */
export function RangePicker({ days, onChange }: RangePickerProps) {
	return <SegmentedControl label="Time range" options={OPTIONS} value={days} onChange={onChange} />;
}
