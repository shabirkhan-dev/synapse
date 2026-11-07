"use client";

import { Button } from "@rabtx/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@rabtx/ui/dropdown-menu";
import { useState } from "react";

export default function DropdownMenuRadio() {
	const [position, setPosition] = useState("bottom");
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Panel: {position}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48">
				<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
					<DropdownMenuLabel>Panel position</DropdownMenuLabel>
					<DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
