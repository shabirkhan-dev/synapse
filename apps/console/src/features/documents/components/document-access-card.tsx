"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { Checkbox } from "@synapse/ui/components/checkbox";
import { Label } from "@synapse/ui/components/label";
import { useState } from "react";

import { SegmentedControl } from "@/components/shared/segmented-control";

import type { DocumentAccess } from "../types/document.types";

export type AccessMember = { userId: string; email: string; role: "owner" | "admin" | "member" };

export type DocumentAccessCardProps = {
	access: DocumentAccess;
	sharedWith: string[];
	/** The team's members; owners and admins always read every document. */
	members: AccessMember[];
	/** Who added the document (always reads it); null for documents from before access existed. */
	createdBy: string | null;
	canManage: boolean;
	saving: boolean;
	error: string | null;
	onSave: (change: { access: DocumentAccess; userIds: string[] }) => void;
};

const OPTIONS = [
	{ value: "organization", label: "Everyone in the team" },
	{ value: "restricted", label: "Only people you choose" },
] as const;

/** Who reads this document: the whole team, or chosen members (plus its adder, owners and admins). */
export function DocumentAccessCard({
	access,
	sharedWith,
	members,
	createdBy,
	canManage,
	saving,
	error,
	onSave,
}: DocumentAccessCardProps) {
	const [choice, setChoice] = useState<DocumentAccess>(access);
	const [chosen, setChosen] = useState<string[]>(sharedWith);
	const alwaysReads = (member: AccessMember) =>
		member.role !== "member" || member.userId === createdBy;
	const changed =
		choice !== access ||
		(choice === "restricted" &&
			(chosen.length !== sharedWith.length || chosen.some((id) => !sharedWith.includes(id))));

	const summary =
		access === "organization"
			? "Everyone in the team can find and read it."
			: `Only ${sharedWith.length === 0 ? "whoever added it" : `whoever added it and ${sharedWith.length === 1 ? "1 person" : `${sharedWith.length} people`}`}, plus owners and admins, can find and read it.`;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Who can see it</CardTitle>
				<CardDescription>
					{summary} Search, answers and chat leave it out for everyone else.
				</CardDescription>
			</CardHeader>
			{canManage ? (
				<CardContent className="flex flex-col gap-4">
					<SegmentedControl
						label="Who can see it"
						options={OPTIONS}
						value={choice}
						onChange={setChoice}
					/>
					{choice === "restricted" ? (
						<fieldset className="flex flex-col gap-2">
							<legend className="mb-2 text-sm font-medium">People</legend>
							<ul className="flex flex-col gap-2">
								{members.map((member) => {
									const always = alwaysReads(member);
									return (
										<li key={member.userId}>
											<Label className="flex items-center gap-2.5 font-normal">
												<Checkbox
													checked={always || chosen.includes(member.userId)}
													disabled={always}
													onCheckedChange={(checked) =>
														setChosen((current) =>
															checked
																? [...current, member.userId]
																: current.filter((id) => id !== member.userId),
														)
													}
												/>
												<span className="min-w-0 truncate">{member.email}</span>
												{always ? (
													<span className="text-xs text-muted-foreground">
														{member.userId === createdBy
															? "added it"
															: `${member.role === "owner" ? "owner" : "admin"}, always`}
													</span>
												) : null}
											</Label>
										</li>
									);
								})}
							</ul>
						</fieldset>
					) : null}
					{error ? (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
					<Button
						className="self-start"
						disabled={!changed || saving}
						onClick={() =>
							onSave({
								access: choice,
								userIds: choice === "restricted" ? chosen : [],
							})
						}
					>
						{saving ? "Saving…" : "Save who can see it"}
					</Button>
				</CardContent>
			) : null}
		</Card>
	);
}
