"use client";

import { Button } from "@rabtx/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@rabtx/ui/dropdown-menu";
import { useState } from "react";

export default function DropdownMenuCheckboxes() {
	const [statusBar, setStatusBar] = useState(true);
	const [activityBar, setActivityBar] = useState(false);
	const [panel, setPanel] = useState(false);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">View</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					<DropdownMenuCheckboxItem
						checked={statusBar}
						onCheckedChange={setStatusBar}
						onSelect={(event) => event.preventDefault()}
					>
						Status bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={activityBar}
						onCheckedChange={setActivityBar}
						onSelect={(event) => event.preventDefault()}
						disabled
					>
						Activity bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={panel}
						onCheckedChange={setPanel}
						onSelect={(event) => event.preventDefault()}
					>
						Panel
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
