import { Slider } from "@rabtx/ui/slider";

export default function SliderMarks() {
	return (
		<div className="grid w-80 gap-8">
			<Slider aria-label="Rating" defaultValue={[3]} min={0} max={10} marks />
			<Slider
				aria-label="Quality"
				defaultValue={[50]}
				step={25}
				marks={[
					{ value: 0, label: "Low" },
					{ value: 25 },
					{ value: 50, label: "Medium" },
					{ value: 75 },
					{ value: 100, label: "High" },
				]}
			/>
		</div>
	);
}
