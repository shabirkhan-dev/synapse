export type SettingsTheme = "light" | "dark" | "system";
export type SettingsDensity = "comfortable" | "compact";

/** Everything the main form saves. The email and the account itself change through dialogs. */
export type SettingsValues = {
	/** Profile. */
	name: string;
	username: string;
	website: string;
	bio: string;
	/** Account: language and region. */
	language: string;
	timezone: string;
	/** Notifications: switches. */
	mentions: boolean;
	comments: boolean;
	security: boolean;
	/** Notifications: email digest checkboxes. */
	dailyDigest: boolean;
	weeklyDigest: boolean;
	productNews: boolean;
	/** Appearance. */
	theme: SettingsTheme;
	density: SettingsDensity;
};

export type SettingsField = keyof SettingsValues;
/** A message per field, to show under it. */
export type SettingsErrors = Partial<Record<SettingsField, string>>;
export type SettingsOption = { value: string; label: string };

export type SettingsSection = "profile" | "account" | "notifications" | "appearance" | "danger";

export const SETTINGS_SECTIONS: { id: SettingsSection; label: string; description: string }[] = [
	{ id: "profile", label: "Profile", description: "How others see you." },
	{ id: "account", label: "Account", description: "Your sign-in email, plan and region." },
	{ id: "notifications", label: "Notifications", description: "What we tell you, and where." },
	{ id: "appearance", label: "Appearance", description: "How the app looks on this device." },
	{ id: "danger", label: "Danger zone", description: "Actions you cannot undo." },
];

/** The section each saved field lives in, so a failed save can open the right one. */
export const FIELD_SECTION: Record<SettingsField, SettingsSection> = {
	name: "profile",
	username: "profile",
	website: "profile",
	bio: "profile",
	language: "account",
	timezone: "account",
	mentions: "notifications",
	comments: "notifications",
	security: "notifications",
	dailyDigest: "notifications",
	weeklyDigest: "notifications",
	productNews: "notifications",
	theme: "appearance",
	density: "appearance",
};

export const SETTINGS_DEFAULTS: SettingsValues = {
	name: "",
	username: "",
	website: "",
	bio: "",
	language: "en",
	timezone: "Asia/Karachi",
	mentions: true,
	comments: true,
	security: true,
	dailyDigest: false,
	weeklyDigest: true,
	productNews: false,
	theme: "system",
	density: "comfortable",
};

export const DEFAULT_LANGUAGES: SettingsOption[] = [
	{ value: "en", label: "English" },
	{ value: "ur", label: "اردو (Urdu)" },
	{ value: "ar", label: "العربية (Arabic)" },
	{ value: "de", label: "Deutsch" },
	{ value: "fr", label: "Français" },
	{ value: "es", label: "Español" },
];

export const DEFAULT_TIMEZONES: SettingsOption[] = [
	{ value: "Pacific/Honolulu", label: "(UTC−10:00) Honolulu" },
	{ value: "America/Los_Angeles", label: "(UTC−08:00) Los Angeles" },
	{ value: "America/New_York", label: "(UTC−05:00) New York" },
	{ value: "Europe/London", label: "(UTC+00:00) London" },
	{ value: "Europe/Berlin", label: "(UTC+01:00) Berlin" },
	{ value: "Asia/Dubai", label: "(UTC+04:00) Dubai" },
	{ value: "Asia/Karachi", label: "(UTC+05:00) Karachi" },
	{ value: "Asia/Kolkata", label: "(UTC+05:30) Kolkata" },
	{ value: "Asia/Singapore", label: "(UTC+08:00) Singapore" },
	{ value: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
];

/** The fields whose value differs from `saved`, in form order. */
export function changedFields(values: SettingsValues, saved: SettingsValues): SettingsField[] {
	return (Object.keys(values) as SettingsField[]).filter((key) => values[key] !== saved[key]);
}

/** Up to two initials from a name, for an avatar without a picture. */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	const first = Array.from(words[0])[0] ?? "";
	const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
	return (first + last).toUpperCase();
}
