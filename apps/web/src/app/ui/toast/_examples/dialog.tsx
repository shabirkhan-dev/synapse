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
import { Toaster, toast } from "@rabtx/ui/toast";

export default function ToastDialog() {
	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="secondary">Edit profile</Button>
				</DialogTrigger>
				<DialogContent size="sm">
					<DialogHeader>
						<DialogTitle>Edit profile</DialogTitle>
						<DialogDescription>
							The toast shows above this dialog and its backdrop.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Close</Button>
						</DialogClose>
						<Button onClick={() => toast.success("Profile saved")}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Toaster />
		</>
	);
}
