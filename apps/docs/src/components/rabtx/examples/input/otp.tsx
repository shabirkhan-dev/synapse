"use client";

import { Field } from "@rabtx/ui/field";
import { InputOTP } from "@rabtx/ui/input";
import { useState } from "react";

export default function InputOtp() {
	const [status, setStatus] = useState("");

	return (
		<div className="grid gap-6">
			<Field label="Verification code" hint={status || "Sent to •••• 4821."}>
				<InputOTP
					onValueChange={() => setStatus("")}
					onComplete={(code) => setStatus(`Checking ${code}…`)}
				/>
			</Field>
			<Field label="Recovery PIN" error="That PIN is not right.">
				<InputOTP length={4} size="lg" mask defaultValue="1234" />
			</Field>
			<InputOTP aria-label="Invite code" length={5} size="sm" charset="alphanumeric" />
		</div>
	);
}
