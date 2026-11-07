"use client";

import { Button } from "@rabtx/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@rabtx/ui/dialog";
import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";
import { useState } from "react";

export default function DialogForm() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("Shabir Khan");

	return (
		<div className="flex flex-col items-center gap-2">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="secondary">Edit profile</Button>
				</DialogTrigger>
				<DialogContent size="sm">
					<form
						className="contents"
						onSubmit={(event) => {
							event.preventDefault();
							const data = new FormData(event.currentTarget);
							setName(String(data.get("name")));
							setOpen(false);
						}}
					>
						<DialogHeader>
							<DialogTitle>Edit profile</DialogTitle>
							<DialogDescription>This is how teammates see you.</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3">
							<Field label="Name">
								<Input name="name" defaultValue={name} required autoComplete="name" />
							</Field>
							<Field label="Username" hint="Letters, numbers and dashes.">
								<Input name="username" defaultValue="shabir" startAddon="@" pattern="[\w-]+" />
							</Field>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="ghost">Cancel</Button>
							</DialogClose>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<p className="text-xs text-muted-foreground">Signed in as {name}</p>
		</div>
	);
}
