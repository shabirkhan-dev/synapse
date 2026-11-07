"use client";

import { SignupBlock } from "@rabtx/ui/blocks/signup";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Try taken@example.com on the first step, and 000000 as the code. */
export default function SignupBlockExample() {
	return (
		<SignupBlock
			headingLevel={3}
			description="Try taken@example.com, or 000000 as the code, to see the errors."
			onSubmit={async (values) => {
				await wait(900); // your API: create the account and email a code
				if (values.email.toLowerCase() === "taken@example.com") {
					return { email: "That email already has an account. Sign in instead." };
				}
			}}
			onVerify={async (code) => {
				await wait(900); // your API: check the code
				if (code === "000000") return "That code is not right. Check the email and try again.";
			}}
			footer={
				<>
					Already have an account?{" "}
					<a href="#signin" className="font-[510] text-foreground underline underline-offset-4">
						Sign in
					</a>
				</>
			}
		/>
	);
}
