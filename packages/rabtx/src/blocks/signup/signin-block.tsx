"use client";

import { type FormEvent, type ReactNode, type Ref, useId, useState } from "react";
import { Button } from "../../button/button";
import type { ButtonState } from "../../button/button.styles";
import { StatefulButton } from "../../button/stateful-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../card/card";
import { Checkbox } from "../../checkbox/checkbox";
import { Field } from "../../field/field";
import { Input, PasswordInput } from "../../input/input";
import { cn } from "../../lib/utils";
import { GithubIcon, GoogleIcon, LockIcon, MailIcon } from "./icons";
import { signupParts } from "./signup.styles";
import { type ValidityMessages, validityMessage } from "./validity";

export type SigninValues = { email: string; password: string; remember: boolean };
export type SigninErrors = Partial<Record<"email" | "password", string>>;
export type SigninProvider = "google" | "github";

export type SigninBlockProps = {
	title?: ReactNode;
	description?: ReactNode;
	/** Social sign-in buttons, in order. Pass `[]` for none. */
	providers?: SigninProvider[];
	/** Called with the provider when its button is pressed. */
	onProvider?: (provider: SigninProvider) => void;
	/**
	 * Check the credentials. Return field errors to show them, or throw to show the error's message
	 * (such as "Wrong email or password."). Without it, the block waits a moment and succeeds.
	 */
	onSubmit?: (values: SigninValues) => Promise<SigninErrors | void> | SigninErrors | void;
	/** The "Forgot password?" link's address. */
	forgotHref?: string;
	/** Under the form, such as a link to sign up. */
	footer?: ReactNode;
	/** The title's heading level, to fit the page around it. */
	headingLevel?: 2 | 3 | 4;
	className?: string;
	ref?: Ref<HTMLElement>;
};

const PROVIDERS: Record<SigninProvider, { label: string; icon: ReactNode }> = {
	google: { label: "Google", icon: <GoogleIcon /> },
	github: { label: "GitHub", icon: <GithubIcon /> },
};

const MESSAGES: Record<"email" | "password", ValidityMessages> = {
	email: {
		valueMissing: "Enter your email address.",
		typeMismatch: "Enter an email address like name@example.com.",
	},
	password: { valueMissing: "Enter your password." },
};

const DEFAULT_PROVIDERS: SigninProvider[] = ["google", "github"];

function check(control: HTMLInputElement) {
	return validityMessage(control, MESSAGES[control.name as "email" | "password"]);
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A compact sign-in card: social buttons, email and password with native constraints, remember
 * me, and a submit button that shows its progress. Nothing is sent: wire `onSubmit`.
 */
export function SigninBlock({
	title = "Welcome back",
	description = "Sign in to your account.",
	providers = DEFAULT_PROVIDERS,
	onProvider,
	onSubmit,
	forgotHref = "#",
	footer,
	headingLevel = 2,
	className,
	ref,
}: SigninBlockProps) {
	const id = useId();
	const [errors, setErrors] = useState<SigninErrors>({});
	const [formError, setFormError] = useState<string>();
	const [state, setState] = useState<ButtonState>("idle");
	const busy = state === "loading";

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const form = event.currentTarget;
		const controls = ["email", "password"]
			.map((name) => form.elements.namedItem(name))
			.filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);
		const found: SigninErrors = {};
		for (const control of controls) {
			const message = check(control);
			if (message) found[control.name as "email" | "password"] = message;
		}
		setErrors(found);
		setFormError(undefined);
		const first = controls.find((control) => found[control.name as "email" | "password"]);
		if (first) {
			first.focus();
			return;
		}
		const data = new FormData(form);
		const values: SigninValues = {
			email: String(data.get("email") ?? ""),
			password: String(data.get("password") ?? ""),
			remember: data.get("remember") === "on",
		};
		setState("loading");
		try {
			const result = onSubmit ? await onSubmit(values) : await pause(900);
			if (result && Object.values(result).some(Boolean)) {
				setErrors(result);
				setState("error");
				return;
			}
			setState("success");
		} catch (error) {
			setFormError(
				error instanceof Error && error.message ? error.message : "Something went wrong.",
			);
			setState("error");
		}
	}

	function revalidate(control: HTMLInputElement) {
		if (state === "error") setState("idle");
		setFormError(undefined);
		const name = control.name as "email" | "password";
		if (errors[name]) setErrors((current) => ({ ...current, [name]: check(control) }));
	}

	return (
		<Card
			as="section"
			size="lg"
			ref={ref}
			aria-labelledby={`${id}-title`}
			className={cn(signupParts.root, "w-full max-w-sm", className)}
		>
			<CardHeader>
				<CardTitle as={`h${headingLevel}`} id={`${id}-title`} className="text-lg/7 font-[590]">
					{title}
				</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			{providers.length > 0 ? (
				<CardContent className="grid gap-3">
					<div className="grid auto-cols-fr grid-flow-col gap-2">
						{providers.map((provider) => (
							<Button
								key={provider}
								variant="outline"
								disabled={busy}
								onClick={() => onProvider?.(provider)}
							>
								{PROVIDERS[provider].icon}
								{PROVIDERS[provider].label}
							</Button>
						))}
					</div>
					<p className={signupParts.divider}>or</p>
				</CardContent>
			) : null}
			<form noValidate aria-busy={busy || undefined} onSubmit={submit} className="grid gap-4">
				<fieldset disabled={busy} className="m-0 grid min-w-0 gap-4 border-0 p-0">
					<legend className="sr-only">Email and password</legend>
					<Field label="Email" error={errors.email}>
						<Input
							name="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							placeholder="you@example.com"
							required
							leadingIcon={<MailIcon />}
							onChange={(event) => revalidate(event.target)}
						/>
					</Field>
					<Field label="Password" error={errors.password}>
						<PasswordInput
							name="password"
							autoComplete="current-password"
							required
							leadingIcon={<LockIcon />}
							onChange={(event) => revalidate(event.target)}
						/>
					</Field>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Checkbox name="remember" size="sm">
							Remember me
						</Checkbox>
						<a
							href={forgotHref}
							className="rounded-sm text-[13px]/5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
						>
							Forgot password?
						</a>
					</div>
				</fieldset>
				{formError ? (
					<p
						role="alert"
						className="m-0 rounded-(--radius-control) bg-destructive/10 px-3 py-2 text-[13px]/5 text-destructive"
					>
						{formError}
					</p>
				) : null}
				<StatefulButton
					type="submit"
					state={state}
					loadingText="Signing in"
					successText="Signed in"
					errorText="Try again"
					className="w-full"
				>
					Sign in
				</StatefulButton>
			</form>
			{footer ? (
				<div className="text-center text-[13px]/5 text-muted-foreground">{footer}</div>
			) : null}
		</Card>
	);
}
