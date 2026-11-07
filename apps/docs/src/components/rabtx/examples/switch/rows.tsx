import { Switch } from "@rabtx/ui/switch";

const settings = [
	{ label: "Mentions and replies", on: true },
	{ label: "Weekly digest", on: false },
	{ label: "Product news", on: false },
];

export default function SwitchRows() {
	return (
		<div className="grid w-72 divide-y divide-border">
			{settings.map(({ label, on }) => (
				<Switch
					key={label}
					size="sm"
					defaultChecked={on}
					className="flex w-full flex-row-reverse justify-between py-2.5"
				>
					{label}
				</Switch>
			))}
		</div>
	);
}
