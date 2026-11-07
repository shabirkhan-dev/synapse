"use client";

import {
	type CSSProperties,
	type FormEvent,
	type ReactNode,
	type Ref,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "../../button/button";
import type { ButtonState } from "../../button/button.styles";
import { StatefulButton } from "../../button/stateful-button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../card/card";
import { Checkbox } from "../../checkbox/checkbox";
import { Field } from "../../field/field";
import { fieldParts } from "../../field/field.styles";
import { Input, PasswordInput } from "../../input/input";
import { InputOTP } from "../../input/input-otp";
import { cn } from "../../lib/utils";
import { Select, SelectItem } from "../../select/select";
import { Switch } from "../../switch/switch";
import { ArrowLeftIcon, ArrowRightIcon, LockIcon, MailIcon, TickIcon, UserIcon } from "./icons";
import {
	MIN_PASSWORD_LENGTH,
	type StrengthScore,
	passwordStrength,
	strengthLabels,
} from "./password-strength";
import { STEP_EXIT_MS, signupParts } from "./signup.styles";
import { type ValidityMessages, validityMessage } from "./validity";

export type SignupValues = {
	name: string;
	email: string;
	password: string;
	role: string;
	country: string;
	/** The terms checkbox. Required. */
	terms: boolean;
	/** The product updates switch. */
	updates: boolean;
};

export type SignupField = keyof SignupValues;
/** A message per field, to show under it. */
export type SignupErrors = Partial<Record<SignupField, string>>;
export type SignupOption = { value: string; label: string };

export type SignupBlockProps = {
	title?: ReactNode;
	description?: ReactNode;
	roles?: SignupOption[];
	countries?: SignupOption[];
	defaultValues?: Partial<SignupValues>;
	/** The terms checkbox's label. Put your links in it. */
	termsLabel?: ReactNode;
	/** Digits in the emailed code. Default 6. */
	codeLength?: number;
	/** Seconds before the code can be sent again. Default 30. */
	resendSeconds?: number;
	/**
	 * Step 1: create the account and send the code. Return field errors to stay on the step (such
	 * as `{ email: "That email already has an account." }`), or throw to show the error's message
	 * above the buttons. Without it, the block waits a moment and moves on.
	 */
	onSubmit?: (values: SignupValues) => Promise<SignupErrors | void> | SignupErrors | void;
	/** Step 2: check the code. Return a message to reject it, or throw. Without it, any code passes. */
	onVerify?: (code: string, values: SignupValues) => Promise<string | void> | string | void;
	/** Send a new code. Without it, the block waits a moment. */
	onResend?: (values: SignupValues) => Promise<void> | void;
	/** The last step's button. Without it, the button starts the flow over. */
	onFinish?: (values: SignupValues, actions: { restart: () => void }) => void;
	finishLabel?: string;
	/** Under the steps, such as a link to sign in. */
	footer?: ReactNode;
	/** The title's heading level, to fit the page around it. Step headings are one below. */
	headingLevel?: 2 | 3 | 4;
	className?: string;
	ref?: Ref<HTMLElement>;
};

const STEPS = [
	{ id: "account", label: "Account", heading: "Your details" },
	{ id: "verify", label: "Verify", heading: "Check your email" },
	{ id: "done", label: "Done", heading: "You're all set" },
] as const;
type StepIndex = 0 | 1 | 2;

const DEFAULT_ROLES: SignupOption[] = [
	{ value: "engineer", label: "Engineer" },
	{ value: "designer", label: "Designer" },
	{ value: "product", label: "Product manager" },
	{ value: "founder", label: "Founder" },
	{ value: "other", label: "Something else" },
];

const DEFAULT_COUNTRIES: SignupOption[] = [
	{ value: "pk", label: "Pakistan" },
	{ value: "ae", label: "United Arab Emirates" },
	{ value: "gb", label: "United Kingdom" },
	{ value: "us", label: "United States" },
	{ value: "de", label: "Germany" },
	{ value: "in", label: "India" },
];

const EMPTY: SignupValues = {
	name: "",
	email: "",
	password: "",
	role: "",
	country: "",
	terms: false,
	updates: false,
};

/** The fields of step 1, in order: errors focus the first one that fails. */
const ACCOUNT_FIELDS = ["name", "email", "password", "role", "country", "terms"] as const;
type AccountField = (typeof ACCOUNT_FIELDS)[number];

const TOO_SHORT = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
const MESSAGES: Record<AccountField, ValidityMessages> = {
	name: { valueMissing: "Enter your name.", patternMismatch: "Enter your name." },
	email: {
		valueMissing: "Enter your email address.",
		typeMismatch: "Enter an email address like name@example.com.",
		patternMismatch: "Enter an email address like name@example.com.",
	},
	password: { valueMissing: "Choose a password.", tooShort: TOO_SHORT, customError: TOO_SHORT },
	role: { valueMissing: "Choose the role closest to yours." },
	country: { valueMissing: "Choose your country." },
	terms: { valueMissing: "Accept the terms to continue." },
};

/** Stands in for your API when a callback is left out, so the flow can be tried as is. */
const SIMULATED_MS = 900;
/** How long "Verified" shows before the last step opens. */
const VERIFIED_HOLD_MS = 650;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Control = HTMLInputElement | HTMLSelectElement;
type Leaving = { step: StepIndex; dir: 1 | -1 };

/** The control's message, after syncing the constraints only script can express. */
function check(control: Control): string | undefined {
	const name = control.name as AccountField;
	if (name === "password" && control instanceof HTMLInputElement) {
		const short = control.value.length > 0 && control.value.length < MIN_PASSWORD_LENGTH;
		control.setCustomValidity(short ? TOO_SHORT : "");
	}
	return validityMessage(control, MESSAGES[name]);
}

/**
 * A three-step sign-up in a Card: details, an emailed code, then done. One native `<form>`: the
 * browser's constraints (`required`, `type="email"`, `pattern`, a custom validity for the password
 * length) decide what is wrong, Field shows it, and `:user-invalid` colors it. An error shows when
 * a filled field loses focus or on Continue, and clears as soon as the field is fixed.
 *
 * Steps slide and fade in CSS (`@starting-style` in, a keyframe out) while the card eases to the
 * new height; reduced motion and `data-motion="off"` switch steps at once. Each new step's heading
 * takes focus and a polite live region names the step.
 *
 * Nothing is sent anywhere: wire `onSubmit`, `onVerify` and `onResend` to your API.
 */
export function SignupBlock({
	title = "Create your account",
	description = "Three quick steps and you are in.",
	roles = DEFAULT_ROLES,
	countries = DEFAULT_COUNTRIES,
	defaultValues,
	termsLabel = "I agree to the Terms of Service and Privacy Policy",
	codeLength = 6,
	resendSeconds = 30,
	onSubmit,
	onVerify,
	onResend,
	onFinish,
	finishLabel = "Get started",
	footer,
	headingLevel = 2,
	className,
	ref,
}: SignupBlockProps) {
	const id = useId();
	const [step, setStep] = useState<StepIndex>(0);
	const [dir, setDir] = useState<1 | -1>(1);
	const [leaving, setLeaving] = useState<Leaving[]>([]);
	const [moved, setMoved] = useState(false);
	const [values, setValues] = useState<SignupValues>(() => ({ ...EMPTY, ...defaultValues }));
	const [errors, setErrors] = useState<SignupErrors>({});
	const [formError, setFormError] = useState<string>();
	const [status, setStatus] = useState<{ step: StepIndex; state: ButtonState }>({
		step: 0,
		state: "idle",
	});
	const [code, setCode] = useState("");
	const [codeError, setCodeError] = useState<string>();
	const [resendIn, setResendIn] = useState(0);
	const [resending, setResending] = useState(false);
	const [announcement, setAnnouncement] = useState("");

	const formRef = useRef<HTMLFormElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	/** The code as typed, ahead of state, so a submit fired by the last digit sees all of it. */
	const codeRef = useRef("");
	/** A field to focus after the next render, once a disabled step is enabled again. */
	const focusNext = useRef<string | null>(null);

	const busy = status.state === "loading";
	const stateOf = (index: StepIndex): ButtonState =>
		status.step === index ? status.state : "idle";

	// The leaving step stays for its exit animation, then goes.
	useEffect(() => {
		if (leaving.length === 0) return;
		const timer = setTimeout(() => setLeaving([]), STEP_EXIT_MS);
		return () => clearTimeout(timer);
	}, [leaving]);

	// A new step: its heading takes focus (not on the first render).
	useEffect(() => {
		if (!moved) return;
		viewportRef.current
			?.querySelector<HTMLElement>(`[data-step="${STEPS[step].id}"] .${signupParts.heading}`)
			?.focus();
	}, [step, moved]);

	useEffect(() => {
		if (!focusNext.current || busy) return;
		const target = formRef.current?.elements.namedItem(focusNext.current);
		focusNext.current = null;
		if (target instanceof HTMLElement) target.focus();
	});

	// The viewport eases to the current step's height; only the CSS variable changes.
	useEffect(() => {
		const viewport = viewportRef.current;
		const panel = viewport?.querySelector<HTMLElement>(
			`[data-step="${STEPS[step].id}"][data-current]`,
		);
		if (!viewport || !panel) return;
		const measure = () => viewport.style.setProperty("--_h", `${panel.offsetHeight}px`);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(panel);
		return () => observer.disconnect();
	}, [step]);

	// The resend countdown, one second at a time, only while the code step is open.
	useEffect(() => {
		if (step !== 1 || resendIn <= 0) return;
		const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
		return () => clearTimeout(timer);
	}, [step, resendIn]);

	function go(next: StepIndex) {
		const direction = next > step ? 1 : -1;
		setLeaving((list) => [...list.filter((item) => item.step !== next), { step, dir: direction }]);
		setDir(direction);
		setStep(next);
		setMoved(true);
		setFormError(undefined);
		setAnnouncement(`Step ${next + 1} of ${STEPS.length}: ${STEPS[next].heading}`);
	}

	function restart() {
		setValues({ ...EMPTY, ...defaultValues });
		setErrors({});
		changeCode("");
		setCodeError(undefined);
		setStatus({ step: 0, state: "idle" });
		go(0);
	}

	function update<K extends SignupField>(name: K, value: SignupValues[K], control?: Control) {
		setValues((current) => ({ ...current, [name]: value }));
		setFormError(undefined);
		if (status.step === 0 && status.state === "error") setStatus({ step: 0, state: "idle" });
		// Reward early: a field showing an error clears it the moment it is fixed.
		if (control && errors[name]) setErrors((current) => ({ ...current, [name]: check(control) }));
	}

	/** Punish late: a filled field is checked when focus leaves it, an empty one only on Continue. */
	function onBlurField(event: { currentTarget: Control }) {
		const control = event.currentTarget;
		if (!control.value) return;
		setErrors((current) => ({ ...current, [control.name]: check(control) }));
	}

	async function submitAccount(form: HTMLFormElement) {
		const controls = ACCOUNT_FIELDS.map((name) => form.elements.namedItem(name)).filter(
			(el): el is Control => el instanceof HTMLInputElement || el instanceof HTMLSelectElement,
		);
		const found: SignupErrors = {};
		for (const control of controls) {
			const message = check(control);
			if (message) found[control.name as AccountField] = message;
		}
		setErrors(found);
		const first = controls.find((control) => found[control.name as AccountField]);
		if (first) {
			first.focus();
			return;
		}

		setStatus({ step: 0, state: "loading" });
		try {
			const result = onSubmit ? await onSubmit(values) : await pause(SIMULATED_MS);
			const fieldErrors = result ? Object.entries(result).filter(([, message]) => message) : [];
			if (fieldErrors.length > 0) {
				setErrors(Object.fromEntries(fieldErrors));
				focusNext.current = fieldErrors[0][0];
				setStatus({ step: 0, state: "error" });
				return;
			}
			setStatus({ step: 0, state: "success" });
			changeCode("");
			setCodeError(undefined);
			setResendIn(resendSeconds);
			go(1);
		} catch (error) {
			setFormError(messageOf(error));
			setStatus({ step: 0, state: "error" });
		}
	}

	function changeCode(next: string) {
		codeRef.current = next;
		setCode(next);
	}

	async function submitCode() {
		const typed = codeRef.current;
		if (typed.length < codeLength) {
			setCodeError(`Enter all ${codeLength} digits.`);
			focusNext.current = "code";
			setStatus({ step: 1, state: "idle" });
			return;
		}
		setCodeError(undefined);
		setStatus({ step: 1, state: "loading" });
		try {
			const message = onVerify ? await onVerify(typed, values) : await pause(SIMULATED_MS);
			if (typeof message === "string" && message) {
				setCodeError(message);
				changeCode("");
				focusNext.current = "code";
				setStatus({ step: 1, state: "error" });
				return;
			}
			setStatus({ step: 1, state: "success" });
			await pause(VERIFIED_HOLD_MS);
			go(2);
		} catch (error) {
			setCodeError(messageOf(error));
			focusNext.current = "code";
			setStatus({ step: 1, state: "error" });
		}
	}

	async function resend() {
		setResending(true);
		try {
			if (onResend) await onResend(values);
			else await pause(SIMULATED_MS / 2);
			changeCode("");
			setCodeError(undefined);
			setResendIn(resendSeconds);
			setAnnouncement(`We sent a new code to ${values.email}.`);
		} catch (error) {
			setCodeError(messageOf(error));
		} finally {
			setResending(false);
		}
	}

	function onFormSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		if (step === 0) void submitAccount(event.currentTarget);
		else if (step === 1) void submitCode();
	}

	const strength = passwordStrength(values.password);
	const panels: { index: StepIndex; leaving?: Leaving }[] = [
		...leaving.map((item) => ({ index: item.step, leaving: item })),
		{ index: step },
	];

	function renderStep(index: StepIndex, current: boolean): ReactNode {
		const headingId = `${id}-step-${index}`;
		const Heading = `h${headingLevel + 1}` as "h3";
		const heading = (
			<Heading id={headingId} tabIndex={-1} className={signupParts.heading}>
				{STEPS[index].heading}
			</Heading>
		);

		if (index === 0) {
			const termsError = errors.terms;
			return (
				<>
					<fieldset
						disabled={!current || busy}
						aria-labelledby={headingId}
						className="m-0 grid min-w-0 gap-4 border-0 p-0"
					>
						{heading}
						<Field label="Full name" error={errors.name}>
							<Input
								name="name"
								autoComplete="name"
								placeholder="Ada Lovelace"
								required
								pattern=".*\S.*"
								leadingIcon={<UserIcon />}
								value={values.name}
								onChange={(event) => update("name", event.target.value, event.target)}
								onBlur={onBlurField}
							/>
						</Field>
						<Field label="Email" error={errors.email}>
							<Input
								name="email"
								type="email"
								inputMode="email"
								autoComplete="email"
								placeholder="you@example.com"
								required
								pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
								leadingIcon={<MailIcon />}
								value={values.email}
								onChange={(event) => update("email", event.target.value, event.target)}
								onBlur={onBlurField}
							/>
						</Field>
						<Field
							label="Password"
							error={errors.password}
							hint={
								strength > 0
									? `Strength: ${strengthLabels[strength]}`
									: `At least ${MIN_PASSWORD_LENGTH} characters.`
							}
						>
							<PasswordInput
								name="password"
								autoComplete="new-password"
								placeholder="Create a password"
								required
								minLength={MIN_PASSWORD_LENGTH}
								leadingIcon={<LockIcon />}
								value={values.password}
								onChange={(event) => update("password", event.target.value, event.target)}
								onBlur={onBlurField}
							/>
							<StrengthMeter score={strength} />
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Role" error={errors.role}>
								<Select
									name="role"
									required
									placeholder="Choose a role"
									value={values.role}
									onChange={(event) => update("role", event.target.value, event.target)}
									onBlur={onBlurField}
								>
									{roles.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</Select>
							</Field>
							<Field label="Country" error={errors.country}>
								<Select
									name="country"
									autoComplete="country"
									required
									placeholder="Choose a country"
									value={values.country}
									onChange={(event) => update("country", event.target.value, event.target)}
									onBlur={onBlurField}
								>
									{countries.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</Select>
							</Field>
						</div>
						<div className="grid gap-1.5">
							<Checkbox
								name="terms"
								required
								checked={values.terms}
								aria-invalid={termsError ? true : undefined}
								aria-describedby={termsError ? `${id}-terms-error` : undefined}
								onChange={(event) => update("terms", event.target.checked, event.target)}
							>
								{termsLabel}
							</Checkbox>
							{termsError ? (
								<p
									id={`${id}-terms-error`}
									aria-live="polite"
									data-invalid=""
									className={cn(fieldParts.message, "ps-7")}
								>
									{termsError}
								</p>
							) : null}
						</div>
						<Switch
							name="updates"
							size="sm"
							checked={values.updates}
							onCheckedChange={(checked) => update("updates", checked)}
						>
							<span className="text-[13px]/5 text-foreground">Email me product updates</span>
						</Switch>
					</fieldset>
					{current && formError ? <FormError>{formError}</FormError> : null}
					<div className="flex justify-end gap-2">
						<StatefulButton
							type="submit"
							state={stateOf(0)}
							loadingText="Creating account"
							successText="Code sent"
							errorText="Try again"
							icon={<ArrowRightIcon />}
							className="w-full sm:w-auto"
						>
							Continue
						</StatefulButton>
					</div>
				</>
			);
		}

		if (index === 1) {
			const counting = resendIn > 0;
			return (
				<>
					<fieldset
						disabled={!current || busy}
						aria-labelledby={headingId}
						className="m-0 grid min-w-0 gap-4 border-0 p-0"
					>
						<div className="grid gap-1">
							{heading}
							<p className="m-0 text-[13px]/5 text-muted-foreground">
								We sent a {codeLength}-digit code to{" "}
								<span className="font-[510] text-foreground">{values.email}</span>.
							</p>
						</div>
						<Field label="Verification code" error={codeError}>
							<InputOTP
								name="code"
								required
								length={codeLength}
								value={code}
								onValueChange={(next) => {
									changeCode(next);
									setCodeError(undefined);
									if (status.step === 1 && status.state === "error")
										setStatus({ step: 1, state: "idle" });
								}}
								onComplete={() => formRef.current?.requestSubmit()}
							/>
						</Field>
						<p className="m-0 flex flex-wrap items-center gap-x-1 text-[13px]/5 text-muted-foreground">
							Didn&apos;t get it?
							<Button
								variant="ghost"
								size="sm"
								disabled={counting || resending}
								onClick={() => void resend()}
								className="-ms-1"
							>
								{resending
									? "Sending…"
									: counting
										? `Resend code in ${formatSeconds(resendIn)}`
										: "Resend code"}
							</Button>
						</p>
					</fieldset>
					<div className="flex flex-wrap justify-between gap-2">
						<Button variant="secondary" disabled={busy} onClick={() => go(0)}>
							<ArrowLeftIcon />
							Back
						</Button>
						<StatefulButton
							type="submit"
							state={stateOf(1)}
							loadingText="Verifying"
							successText="Verified"
							errorText="Try again"
						>
							Verify email
						</StatefulButton>
					</div>
				</>
			);
		}

		const firstName = values.name.trim().split(/\s+/)[0];
		return (
			<div className="grid justify-items-center gap-3 py-2 text-center">
				<svg className={signupParts.doneMark} viewBox="0 0 56 56" aria-hidden="true">
					<circle cx="28" cy="28" r="25" pathLength={1} />
					<path d="M17 29l7.5 7.5L39 21" pathLength={1} />
				</svg>
				<div className="grid gap-1">
					{heading}
					<p className="m-0 text-[13px]/5 text-pretty text-muted-foreground">
						{firstName ? `Welcome, ${firstName}. ` : ""}Your account is ready
						{values.updates ? ", and we will keep you posted." : "."}
					</p>
				</div>
				<Button
					className="mt-2 w-full"
					onClick={() => (onFinish ? onFinish(values, { restart }) : restart())}
				>
					{onFinish ? finishLabel : "Start over"}
				</Button>
			</div>
		);
	}

	return (
		<Card
			as="section"
			size="lg"
			ref={ref}
			aria-labelledby={`${id}-title`}
			data-moved={moved ? "" : undefined}
			className={cn(signupParts.root, "w-full max-w-md", className)}
		>
			<CardHeader>
				<CardTitle as={`h${headingLevel}`} id={`${id}-title`} className="text-lg/7 font-[590]">
					{title}
				</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<StepProgress current={step} />
			<form ref={formRef} noValidate aria-busy={busy || undefined} onSubmit={onFormSubmit}>
				<div ref={viewportRef} className={signupParts.viewport}>
					{panels.map(({ index, leaving: gone }) => (
						<div
							key={STEPS[index].id}
							className={cn(signupParts.panel, "grid gap-5")}
							data-step={STEPS[index].id}
							data-current={gone ? undefined : ""}
							data-leaving={gone ? "" : undefined}
							inert={gone ? true : undefined}
							style={{ "--_dir": gone ? gone.dir : dir } as CSSProperties}
						>
							{renderStep(index, !gone)}
						</div>
					))}
				</div>
			</form>
			{footer ? (
				<div className="text-center text-[13px]/5 text-muted-foreground">{footer}</div>
			) : null}
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announcement}
			</p>
		</Card>
	);
}

function StepProgress({ current }: { current: StepIndex }) {
	return (
		<ol
			aria-label="Sign-up progress"
			className={signupParts.progress}
			style={{ "--_progress": current / (STEPS.length - 1) } as CSSProperties}
		>
			{STEPS.map((item, index) => {
				// The last step is the finish line: reaching it completes every step.
				const last = current === STEPS.length - 1;
				const state =
					index < current || last ? "complete" : index === current ? "current" : "upcoming";
				return (
					<li
						key={item.id}
						className={signupParts.progressStep}
						data-state={state}
						aria-current={index === current ? "step" : undefined}
					>
						<span className={signupParts.progressDot} aria-hidden="true">
							<span>{index + 1}</span>
							<TickIcon />
						</span>
						<span className={signupParts.progressLabel}>
							{item.label}
							{state === "complete" ? <span className="sr-only"> (done)</span> : null}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

/** Four bars that fill and change tone with the score. The words are the Field's hint. */
function StrengthMeter({ score }: { score: StrengthScore }) {
	return (
		<div className={signupParts.strength} data-score={score} aria-hidden="true">
			{[1, 2, 3, 4].map((bar) => (
				<span
					key={bar}
					className={signupParts.strengthBar}
					data-filled={bar <= score ? "" : undefined}
				/>
			))}
		</div>
	);
}

function FormError({ children }: { children: ReactNode }) {
	return (
		<p
			role="alert"
			className="m-0 rounded-(--radius-control) bg-destructive/10 px-3 py-2 text-[13px]/5 text-destructive"
		>
			{children}
		</p>
	);
}

function messageOf(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: "Something went wrong. Try again.";
}

function formatSeconds(total: number): string {
	const minutes = Math.floor(total / 60);
	const seconds = String(total % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}
