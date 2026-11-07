"use client";

import {
	type FormEvent,
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Badge } from "../../badge/badge";
import type { BadgeTone } from "../../badge/badge.styles";
import { Button } from "../../button/button";
import type { ButtonState } from "../../button/button.styles";
import { StatefulButton } from "../../button/stateful-button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../card/card";
import { Checkbox } from "../../checkbox/checkbox";
import { Field } from "../../field/field";
import { Input } from "../../input/input";
import { cn } from "../../lib/utils";
import { RadioGroup, RadioGroupItem } from "../../radio-group/radio-group";
import { Select, SelectItem } from "../../select/select";
import { Switch } from "../../switch/switch";
import type { TabsOrientation } from "../../tabs/tabs.styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs/tabs";
import { Textarea } from "../../textarea/textarea";
import {
	AlertIcon,
	BellIcon,
	ClockIcon,
	GlobeIcon,
	KeyIcon,
	LinkIcon,
	PaletteIcon,
	UserIcon,
} from "./icons";
import {
	ChangeEmailDialog,
	DeleteAccountDialog,
	SIMULATED_MS,
	messageOf,
} from "./settings-dialogs";
import { SAVED_HOLD_MS, settingsParts } from "./settings.styles";
import { type ValidityMessages, validityMessage } from "./validity";
import {
	DEFAULT_LANGUAGES,
	DEFAULT_TIMEZONES,
	FIELD_SECTION,
	SETTINGS_DEFAULTS,
	SETTINGS_SECTIONS,
	type SettingsDensity,
	type SettingsErrors,
	type SettingsField,
	type SettingsOption,
	type SettingsSection,
	type SettingsTheme,
	type SettingsValues,
	changedFields,
	initials,
} from "./values";

export type SettingsBlockProps = {
	title?: ReactNode;
	description?: ReactNode;
	/** The saved settings to start from. Missing fields take `SETTINGS_DEFAULTS`. */
	defaultValues?: Partial<SettingsValues>;
	/** The sign-in email, shown in Account and changed through its dialog. */
	email?: string;
	/** The plan's name, shown as a Badge. */
	plan?: string;
	planTone?: BadgeTone;
	/** A picture for the avatar. Without it, the name's initials show. */
	avatarUrl?: string;
	languages?: SettingsOption[];
	timezones?: SettingsOption[];
	/** The section open first (uncontrolled). */
	defaultSection?: SettingsSection;
	/** The open section (controlled); pair it with `onSectionChange`. */
	section?: SettingsSection;
	onSectionChange?: (section: SettingsSection) => void;
	/**
	 * Save the form. Return field errors to keep the changes unsaved and show them (the block opens
	 * the section of the first one), or throw to show the error's message on the bar. Without it,
	 * the block waits a moment and keeps the values.
	 */
	onSave?: (
		values: SettingsValues,
		info: { changed: SettingsField[] },
	) => Promise<SettingsErrors | void> | SettingsErrors | void;
	/** "Change email": return a message to reject the address, or throw. */
	onChangeEmail?: (email: string) => Promise<string | void> | string | void;
	/** "Delete account", once the phrase is typed: return a message to refuse, or throw. */
	onDeleteAccount?: () => Promise<string | void> | string | void;
	/** What to type to confirm the deletion. Default "delete my account". */
	deletePhrase?: string;
	/** The title's heading level, to fit the page around it. Card titles are one below. */
	headingLevel?: 2 | 3 | 4;
	className?: string;
	ref?: Ref<HTMLElement>;
};

const SECTION_ICONS: Record<SettingsSection, ReactNode> = {
	profile: <UserIcon />,
	account: <KeyIcon />,
	notifications: <BellIcon />,
	appearance: <PaletteIcon />,
	danger: <AlertIcon />,
};

/** The fields the form checks, in the order an error is looked for. */
const CHECKED_FIELDS = ["name", "username", "website", "bio", "language", "timezone"] as const;
type CheckedField = (typeof CHECKED_FIELDS)[number];

const BIO_MAX = 160;
const MESSAGES: Record<CheckedField, ValidityMessages> = {
	name: { valueMissing: "Enter your name.", patternMismatch: "Enter your name." },
	username: {
		valueMissing: "Choose a username.",
		patternMismatch: "Use 3 to 20 lowercase letters, numbers or underscores.",
	},
	website: { typeMismatch: "Enter a full address, like https://example.com." },
	bio: { tooLong: `Keep it to ${BIO_MAX} characters.` },
	language: { valueMissing: "Choose a language." },
	timezone: { valueMissing: "Choose a time zone." },
};

const NOTIFICATIONS: { name: "mentions" | "comments" | "security"; label: string; hint: string }[] =
	[
		{ name: "mentions", label: "Mentions", hint: "When someone @mentions you." },
		{ name: "comments", label: "Comments", hint: "Replies to threads you are in." },
		{ name: "security", label: "Security alerts", hint: "New sign-ins and password changes." },
	];

const DIGESTS: {
	name: "dailyDigest" | "weeklyDigest" | "productNews";
	label: string;
	hint: string;
}[] = [
	{ name: "dailyDigest", label: "Daily summary", hint: "Every morning, what you missed." },
	{ name: "weeklyDigest", label: "Weekly report", hint: "Activity across your projects." },
	{ name: "productNews", label: "Product news", hint: "New features, a few times a year." },
];

const THEMES: { value: SettingsTheme; label: string }[] = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
];

const DENSITIES: { value: SettingsDensity; label: string; hint: string }[] = [
	{ value: "comfortable", label: "Comfortable", hint: "More room around things." },
	{ value: "compact", label: "Compact", hint: "More on screen at once." },
];

const sectionInfo = (which: SettingsSection) =>
	SETTINGS_SECTIONS.find((item) => item.id === which)!;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isControl = (el: unknown): el is Control =>
	el instanceof HTMLInputElement ||
	el instanceof HTMLSelectElement ||
	el instanceof HTMLTextAreaElement;

function check(control: Control): string | undefined {
	return validityMessage(control, MESSAGES[control.name as CheckedField]);
}

/**
 * A settings page in sections: Profile, Account, Notifications, Appearance and a Danger zone. The
 * section list is vertical beside the panels when the block is wide enough and a scrolling row
 * above them when it is not, decided by a container query (so it follows the block's width, not
 * the window's); the tabs' keyboard axis follows the layout.
 *
 * Everything but the email and the account itself is one native form, checked by the browser's
 * constraints and shown through Field. While anything differs from what was saved, a sticky bar
 * slides in (CSS `:has()` and `@starting-style`) with Discard and Save; Save opens the section of
 * the first error. Change email and Delete account are Dialogs with forms of their own.
 *
 * Nothing is sent anywhere: wire `onSave`, `onChangeEmail` and `onDeleteAccount` to your API.
 */
export function SettingsBlock({
	title = "Settings",
	description = "Manage your profile, account and preferences.",
	defaultValues,
	email: emailProp = "you@example.com",
	plan = "Free",
	planTone = "accent",
	avatarUrl,
	languages = DEFAULT_LANGUAGES,
	timezones = DEFAULT_TIMEZONES,
	defaultSection = "profile",
	section: sectionProp,
	onSectionChange,
	onSave,
	onChangeEmail,
	onDeleteAccount,
	deletePhrase = "delete my account",
	headingLevel = 2,
	className,
	ref,
}: SettingsBlockProps) {
	const id = useId();
	const formId = `${id}-form`;
	const [saved, setSaved] = useState<SettingsValues>(() => ({
		...SETTINGS_DEFAULTS,
		...defaultValues,
	}));
	const [values, setValues] = useState<SettingsValues>(saved);
	const [errors, setErrors] = useState<SettingsErrors>({});
	const [formError, setFormError] = useState<string>();
	const [status, setStatus] = useState<ButtonState>("idle");
	const [internalSection, setInternalSection] = useState<SettingsSection>(defaultSection);
	const section = sectionProp ?? internalSection;
	const [moved, setMoved] = useState(false);
	const [orientation, setOrientation] = useState<TabsOrientation>("vertical");
	const [email, setEmail] = useState(emailProp);
	const [deleted, setDeleted] = useState(false);
	const [announcement, setAnnouncement] = useState("");

	const rootRef = useRef<HTMLElement | null>(null);
	const navRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	/** A control to focus after the next render, once its section is shown. */
	const focusNext = useRef<string | null>(null);

	const changed = changedFields(values, saved);
	const dirty = changed.length > 0;
	const saving = status === "loading";
	// The bar stays for "Saved", then slides away.
	const showBar = dirty || saving || status === "success";
	const H = `h${headingLevel + 1}` as "h3";

	// The tabs' axis follows the layout the container query chose.
	useLayoutEffect(() => {
		const root = rootRef.current;
		const list = navRef.current;
		if (!root || !list) return;
		const measure = () =>
			setOrientation(
				getComputedStyle(list).flexDirection.startsWith("column") ? "vertical" : "horizontal",
			);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!focusNext.current) return;
		const target = formRef.current?.elements.namedItem(focusNext.current);
		focusNext.current = null;
		if (target instanceof HTMLElement) target.focus();
	});

	// "Saved" holds a moment; then the bar leaves and focus, if it was on the bar, goes to the panel.
	useEffect(() => {
		if (status !== "success") return;
		const timer = setTimeout(() => {
			setStatus("idle");
			if (barRef.current?.contains(document.activeElement)) panelOf(section)?.focus();
		}, SAVED_HOLD_MS);
		return () => clearTimeout(timer);
	}, [status, section]);

	function panelOf(which: SettingsSection) {
		return rootRef.current?.querySelector<HTMLElement>(
			`[role="tabpanel"][data-section="${which}"]`,
		);
	}
	const focusPanel = () => panelOf(section)?.focus();

	function openSection(next: SettingsSection) {
		if (next === section) return;
		setMoved(true);
		if (sectionProp === undefined) setInternalSection(next);
		onSectionChange?.(next);
	}

	function update<K extends SettingsField>(name: K, value: SettingsValues[K], control?: Control) {
		const wasDirty = dirty;
		setValues((current) => ({ ...current, [name]: value }));
		setFormError(undefined);
		if (status === "error") setStatus("idle");
		if (!wasDirty && value !== saved[name])
			setAnnouncement("You have unsaved changes. Save or discard them at the bottom.");
		// Reward early: a field showing an error clears it the moment it is fixed.
		if (control && errors[name]) setErrors((current) => ({ ...current, [name]: check(control) }));
	}

	/** Punish late: a filled field is checked when focus leaves it, an empty one only on Save. */
	function onBlurField(event: { currentTarget: Control }) {
		const control = event.currentTarget;
		if (!control.value) return;
		setErrors((current) => ({ ...current, [control.name]: check(control) }));
	}

	function showErrors(found: SettingsErrors) {
		setErrors(found);
		const first = (Object.keys(FIELD_SECTION) as SettingsField[]).find((name) => found[name]);
		if (!first) return;
		const where = FIELD_SECTION[first];
		openSection(where);
		focusNext.current = first;
		const count = Object.values(found).filter(Boolean).length;
		setAnnouncement(
			`${count === 1 ? "1 setting needs" : `${count} settings need`} attention in ${
				SETTINGS_SECTIONS.find((item) => item.id === where)?.label
			}.`,
		);
	}

	async function save(form: HTMLFormElement) {
		const found: SettingsErrors = {};
		for (const name of CHECKED_FIELDS) {
			const control = form.elements.namedItem(name);
			if (!isControl(control)) continue;
			const message = check(control);
			if (message) found[name] = message;
		}
		if (Object.keys(found).length > 0) {
			showErrors(found);
			setStatus("idle");
			return;
		}
		const snapshot = values;
		setErrors({});
		setFormError(undefined);
		setStatus("loading");
		try {
			const result = onSave
				? await onSave(snapshot, { changed: changedFields(snapshot, saved) })
				: await pause(SIMULATED_MS);
			const fieldErrors = result
				? Object.fromEntries(Object.entries(result).filter(([, message]) => message))
				: {};
			if (Object.keys(fieldErrors).length > 0) {
				setStatus("error");
				showErrors(fieldErrors);
				return;
			}
			setSaved(snapshot);
			setStatus("success");
			setAnnouncement("Settings saved.");
		} catch (error) {
			setFormError(messageOf(error));
			setStatus("error");
		}
	}

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving || !dirty) return;
		void save(event.currentTarget);
	}

	function discard() {
		setValues(saved);
		setErrors({});
		setFormError(undefined);
		setStatus("idle");
		setAnnouncement("Changes discarded.");
		focusPanel();
	}

	/** Ctrl+S or Cmd+S saves from anywhere in the block but a dialog. */
	function onKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey) || event.altKey)
			return;
		if ((event.target as Element).closest("dialog")) return;
		event.preventDefault();
		if (dirty && !saving) formRef.current?.requestSubmit();
	}

	const field = { form: formId, onBlur: onBlurField };

	function sectionCard(
		key: string,
		heading: ReactNode,
		text: ReactNode,
		children: ReactNode,
		options: { action?: ReactNode; className?: string } = {},
	) {
		const headingId = `${id}-${key}`;
		return (
			<Card
				as="section"
				size="lg"
				aria-labelledby={headingId}
				className={cn(settingsParts.section, options.className)}
			>
				<CardHeader>
					<CardTitle as={H} id={headingId} className="text-[15px]/[22px] font-[590]">
						{heading}
					</CardTitle>
					{text ? <CardDescription>{text}</CardDescription> : null}
					{options.action ? <CardAction>{options.action}</CardAction> : null}
				</CardHeader>
				<CardContent>{children}</CardContent>
			</Card>
		);
	}

	const profile = (
		<>
			{sectionCard(
				"profile",
				"Profile",
				sectionInfo("profile").description,
				<div className="grid gap-5 @container">
					<div className="flex items-center gap-3">
						<span className={settingsParts.avatar} aria-hidden="true">
							{avatarUrl ? (
								// A portable block: the picture can come from any host, so no framework loader.
								// oxlint-disable-next-line next/no-img-element
								<img src={avatarUrl} alt="" />
							) : (
								initials(values.name)
							)}
						</span>
						<div className="grid min-w-0">
							<span className="truncate text-sm/5 font-[590] text-foreground">
								{values.name.trim() || "Your name"}
							</span>
							<span className="truncate text-[13px]/5 text-muted-foreground">
								@{values.username || "username"}
							</span>
						</div>
						<Badge tone={planTone} className="ms-auto">
							{plan}
						</Badge>
					</div>
					<div className="grid items-start gap-4 @md:grid-cols-2">
						<Field label="Display name" error={errors.name}>
							<Input
								{...field}
								name="name"
								autoComplete="name"
								placeholder="Ada Lovelace"
								required
								maxLength={50}
								pattern=".*\S.*"
								value={values.name}
								onChange={(event) => update("name", event.target.value, event.target)}
							/>
						</Field>
						<Field
							label="Username"
							error={errors.username}
							hint="Lowercase letters, numbers and _."
						>
							<Input
								{...field}
								name="username"
								autoComplete="username"
								autoCapitalize="off"
								spellCheck={false}
								placeholder="ada"
								required
								pattern="[a-z0-9_]{3,20}"
								startAddon="@"
								value={values.username}
								onChange={(event) => update("username", event.target.value, event.target)}
							/>
						</Field>
					</div>
					<Field label="Website" error={errors.website}>
						<Input
							{...field}
							name="website"
							type="url"
							inputMode="url"
							autoComplete="url"
							placeholder="https://example.com"
							leadingIcon={<LinkIcon />}
							value={values.website}
							onChange={(event) => update("website", event.target.value, event.target)}
						/>
					</Field>
					<Field
						label="Bio"
						error={errors.bio}
						hint={`Up to ${BIO_MAX} characters.`}
						className="relative"
					>
						<Textarea
							{...field}
							name="bio"
							rows={3}
							maxLength={BIO_MAX}
							placeholder="A line or two about you."
							value={values.bio}
							onChange={(event) => update("bio", event.target.value, event.target)}
						/>
						{/* Not live: the hint says the limit once, the count is for the eye. */}
						<span
							aria-hidden="true"
							className="absolute end-0 top-0.5 text-xs/4 text-muted-foreground tabular-nums"
						>
							{values.bio.length}/{BIO_MAX}
						</span>
					</Field>
				</div>,
			)}
		</>
	);

	const account = (
		<>
			{sectionCard(
				"account",
				"Account",
				sectionInfo("account").description,
				<div className="grid">
					<div className={settingsParts.row}>
						<div className="grid min-w-0">
							<span className="text-[13px]/5 font-[510] text-foreground">Email</span>
							<span className="truncate text-[13px]/5 text-muted-foreground">{email}</span>
						</div>
						<ChangeEmailDialog
							email={email}
							onChangeEmail={onChangeEmail}
							onChanged={(next) => {
								setEmail(next);
								setAnnouncement(`We sent a confirmation link to ${next}.`);
							}}
						/>
					</div>
					<div className={settingsParts.row}>
						<div className="grid min-w-0">
							<span className="text-[13px]/5 font-[510] text-foreground">Plan</span>
							<span className="text-[13px]/5 text-muted-foreground">
								You are on the {plan} plan.
							</span>
						</div>
						<Badge tone={planTone} dot>
							{plan}
						</Badge>
					</div>
				</div>,
			)}
			{sectionCard(
				"region",
				"Language and region",
				"Used for dates, times and the interface.",
				<div className="grid gap-4 @container">
					<div className="grid items-start gap-4 @md:grid-cols-2">
						<Field label="Language" error={errors.language}>
							<Select
								{...field}
								name="language"
								required
								placeholder="Choose a language"
								leadingIcon={<GlobeIcon />}
								value={values.language}
								onChange={(event) => update("language", event.target.value, event.target)}
							>
								{languages.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</Select>
						</Field>
						<Field label="Time zone" error={errors.timezone}>
							<Select
								{...field}
								name="timezone"
								required
								placeholder="Choose a time zone"
								leadingIcon={<ClockIcon />}
								value={values.timezone}
								onChange={(event) => update("timezone", event.target.value, event.target)}
							>
								{timezones.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</Select>
						</Field>
					</div>
				</div>,
			)}
		</>
	);

	const digestsId = `${id}-digests`;
	const notifications = (
		<>
			{sectionCard(
				"notifications",
				"Notifications",
				"Pushed to your devices as they happen.",
				<div className="grid">
					{NOTIFICATIONS.map((item) => {
						const controlId = `${id}-${item.name}`;
						const labelId = `${controlId}-label`;
						const hintId = `${controlId}-hint`;
						return (
							<label key={item.name} htmlFor={controlId} className={settingsParts.row}>
								<span className="grid min-w-0">
									<span id={labelId} className="text-[13px]/5 font-[510] text-foreground">
										{item.label}
									</span>
									<span id={hintId} className="text-[13px]/5 text-muted-foreground">
										{item.hint}
									</span>
								</span>
								<Switch
									id={controlId}
									form={formId}
									name={item.name}
									size="sm"
									aria-labelledby={labelId}
									aria-describedby={hintId}
									checked={values[item.name]}
									onCheckedChange={(checked) => update(item.name, checked)}
								/>
							</label>
						);
					})}
				</div>,
			)}
			{sectionCard(
				"digests",
				"Email digests",
				"Sent to your sign-in email.",
				<div role="group" aria-labelledby={digestsId} className="grid gap-3">
					{DIGESTS.map((item) => (
						<Checkbox
							key={item.name}
							form={formId}
							name={item.name}
							description={item.hint}
							checked={values[item.name]}
							onCheckedChange={(checked) => update(item.name, checked === true)}
						>
							{item.label}
						</Checkbox>
					))}
				</div>,
			)}
		</>
	);

	const themeId = `${id}-theme`;
	const densityId = `${id}-density`;
	const appearance = (
		<>
			{sectionCard(
				"theme",
				"Theme",
				"System follows your device.",
				<RadioGroup
					form={formId}
					name="theme"
					variant="card"
					orientation="horizontal"
					aria-labelledby={themeId}
					value={values.theme}
					onValueChange={(next) => update("theme", next as SettingsTheme)}
					className="rx-settings-choices"
				>
					{THEMES.map((item) => (
						<RadioGroupItem key={item.value} value={item.value}>
							<span className={settingsParts.swatch} data-theme={item.value} aria-hidden="true">
								<span className={item.value === "dark" ? "rabtx dark" : "rabtx light"} />
								{item.value === "system" ? <span className="rabtx dark" /> : null}
							</span>
							{item.label}
						</RadioGroupItem>
					))}
				</RadioGroup>,
			)}
			{sectionCard(
				"density",
				"Density",
				"How tightly lists and tables are packed.",
				<RadioGroup
					form={formId}
					name="density"
					variant="card"
					orientation="horizontal"
					aria-labelledby={densityId}
					value={values.density}
					onValueChange={(next) => update("density", next as SettingsDensity)}
					className="rx-settings-choices"
				>
					{DENSITIES.map((item) => (
						<RadioGroupItem key={item.value} value={item.value} description={item.hint}>
							<span className={settingsParts.density} data-density={item.value} aria-hidden="true">
								<span />
								<span />
								<span />
							</span>
							{item.label}
						</RadioGroupItem>
					))}
				</RadioGroup>,
			)}
		</>
	);

	const danger = sectionCard(
		"danger",
		"Delete account",
		deleted
			? "Your account is scheduled for deletion. You will get an email when it is gone."
			: "Permanently remove your account and everything in it. This cannot be undone.",
		deleted ? (
			<Badge tone="danger" dot>
				Scheduled for deletion
			</Badge>
		) : (
			<DeleteAccountDialog
				phrase={deletePhrase}
				onDeleteAccount={onDeleteAccount}
				onDeleted={() => {
					setDeleted(true);
					setAnnouncement("Your account is scheduled for deletion.");
					// The trigger is gone; the panel takes focus instead.
					requestAnimationFrame(focusPanel);
				}}
			/>
		),
		{ className: settingsParts.danger },
	);

	const panels: Record<SettingsSection, ReactNode> = {
		profile,
		account,
		notifications,
		appearance,
		danger,
	};

	return (
		// The section only listens for the Ctrl+S / Cmd+S shortcut bubbling up from its controls.
		// oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<section
			ref={(node) => {
				rootRef.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			aria-labelledby={`${id}-title`}
			data-moved={moved ? "" : undefined}
			className={cn(settingsParts.root, className)}
			onKeyDown={onKeyDown}
		>
			<header className="grid gap-1">
				{(() => {
					const Title = `h${headingLevel}` as "h2";
					return (
						<Title id={`${id}-title`} className="m-0 text-xl/7 font-[590] text-foreground">
							{title}
						</Title>
					);
				})()}
				{description ? (
					<p className="m-0 text-[13px]/5 text-muted-foreground">{description}</p>
				) : null}
			</header>
			<form
				ref={formRef}
				id={formId}
				noValidate
				aria-label={typeof title === "string" ? title : "Settings"}
				data-dirty={showBar ? "" : undefined}
				onSubmit={onSubmit}
			/>
			<Tabs
				value={section}
				onValueChange={(next) => openSection(next as SettingsSection)}
				orientation={orientation}
				className={settingsParts.tabs}
			>
				<TabsList ref={navRef} aria-label="Settings sections" className={settingsParts.nav}>
					{SETTINGS_SECTIONS.map((item) => {
						const sectionDirty = changed.some((name) => FIELD_SECTION[name] === item.id);
						const sectionInvalid = (Object.keys(errors) as SettingsField[]).some(
							(name) => errors[name] && FIELD_SECTION[name] === item.id,
						);
						return (
							<TabsTrigger
								key={item.id}
								value={item.id}
								icon={SECTION_ICONS[item.id]}
								data-section={item.id}
								data-dirty={sectionDirty ? "" : undefined}
								data-invalid={sectionInvalid ? "" : undefined}
							>
								{item.label}
								{sectionInvalid ? (
									<span className="sr-only"> (needs attention)</span>
								) : sectionDirty ? (
									<span className="sr-only"> (unsaved changes)</span>
								) : null}
							</TabsTrigger>
						);
					})}
				</TabsList>
				{SETTINGS_SECTIONS.map((item) => (
					<TabsContent
						key={item.id}
						value={item.id}
						data-section={item.id}
						aria-busy={saving || undefined}
						className={settingsParts.panel}
					>
						{panels[item.id]}
					</TabsContent>
				))}
			</Tabs>
			<div
				ref={barRef}
				role="region"
				aria-label="Unsaved changes"
				className={settingsParts.bar}
				data-state={status}
			>
				<p className="m-0 min-w-0 text-[13px]/5 text-foreground">
					{formError ? (
						<span role="alert" className="text-destructive">
							{formError}
						</span>
					) : status === "success" ? (
						"All changes saved."
					) : (
						<span className="font-[590]">
							{changed.length === 1 ? "1 unsaved change" : `${changed.length} unsaved changes`}
						</span>
					)}
				</p>
				<div className="ms-auto flex shrink-0 gap-2">
					<Button variant="ghost" size="sm" disabled={saving || !dirty} onClick={discard}>
						Discard
					</Button>
					<StatefulButton
						type="submit"
						form={formId}
						size="sm"
						state={status}
						loadingText="Saving"
						successText="Saved"
						errorText="Try again"
						aria-keyshortcuts="Control+S Meta+S"
					>
						Save changes
					</StatefulButton>
				</div>
			</div>
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announcement}
			</p>
		</section>
	);
}
