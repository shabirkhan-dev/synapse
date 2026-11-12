import Link from "next/link";

/** Shown on every workspace page until the email is verified. */
export function UnverifiedNotice({ email }: { email: string }) {
	return (
		<p className="text-xs text-pretty">
			Verify your email: open the link we sent to{" "}
			<span className="font-medium break-all">{email}</span>.{" "}
			<Link href="/account" className="underline underline-offset-2 hover:text-foreground">
				Send a new link from your account
			</Link>
		</p>
	);
}
