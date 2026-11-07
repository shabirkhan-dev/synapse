"use client";

import { SigninBlock } from "@rabtx/ui/blocks/signup";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SigninBlockExample() {
	return (
		<SigninBlock
			headingLevel={3}
			onSubmit={async ({ password }) => {
				await wait(900); // your API
				if (password !== "correct horse") throw new Error("Wrong email or password.");
			}}
			footer={
				<>
					New here?{" "}
					<a href="#signup" className="font-[510] text-foreground underline underline-offset-4">
						Create an account
					</a>
				</>
			}
		/>
	);
}
