"use client";

import { Checkbox } from "@rabtx/ui/checkbox";
import { useState } from "react";

const teams = ["Design", "Engineering", "Growth"];

export default function CheckboxIndeterminate() {
	const [picked, setPicked] = useState(["Design"]);
	const all = picked.length === teams.length;

	return (
		<div className="grid gap-3">
			<Checkbox
				checked={all}
				indeterminate={!all && picked.length > 0}
				onCheckedChange={() => setPicked(all ? [] : teams)}
			>
				All teams
			</Checkbox>
			<div className="grid gap-3 pl-8">
				{teams.map((team) => (
					<Checkbox
						key={team}
						checked={picked.includes(team)}
						onCheckedChange={(on) =>
							setPicked((now) => (on ? [...now, team] : now.filter((t) => t !== team)))
						}
					>
						{team}
					</Checkbox>
				))}
			</div>
		</div>
	);
}
