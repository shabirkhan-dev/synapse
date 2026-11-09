import Link from "next/link";

import { AUTH_ROUTES } from "../constants/auth.constants";

const LABELS = {
	signIn: { href: AUTH_ROUTES.SIGN_IN, text: "Sign in" },
	signUp: { href: AUTH_ROUTES.SIGN_UP, text: "Create an account" },
	forgot: { href: AUTH_ROUTES.FORGOT_PASSWORD, text: "Forgot your password?" },
} as const;

/** Links between the signed-out pages. */
export function AuthLinks({ show }: { show: ReadonlyArray<keyof typeof LABELS> }) {
	return show.map((key) => (
		<Link key={key} href={LABELS[key].href} className="underline-offset-4 hover:underline">
			{LABELS[key].text}
		</Link>
	));
}
