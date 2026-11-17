import {
	Activity01Icon,
	AiSearchIcon,
	Analytics01Icon,
	BubbleChatIcon,
	ChartEvaluationIcon,
	CheckmarkCircle02Icon,
	DashboardSpeed01Icon,
	Files01Icon,
	Robot01Icon,
	TestTube01Icon,
	UserCircleIcon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";

export type NavItem = { href: string; label: string; icon: typeof Files01Icon };

/** The sidebar's pages, by group (also listed in the command palette). */
export const NAV: ReadonlyArray<{ label: string; items: ReadonlyArray<NavItem> }> = [
	{
		label: "Workspace",
		items: [
			{ href: "/documents", label: "Documents", icon: Files01Icon },
			{ href: "/chat", label: "Chat", icon: BubbleChatIcon },
			{ href: "/playground", label: "Playground", icon: TestTube01Icon },
			{ href: "/retrieval", label: "Retrieval", icon: AiSearchIcon },
			{ href: "/evaluations", label: "Evaluations", icon: ChartEvaluationIcon },
			{ href: "/agents", label: "Agents", icon: Robot01Icon },
		],
	},
	{
		label: "Oversight",
		items: [
			{ href: "/approvals", label: "Approvals", icon: CheckmarkCircle02Icon },
			{ href: "/activity", label: "Activity", icon: Activity01Icon },
			{ href: "/usage", label: "Usage", icon: Analytics01Icon },
			{ href: "/system", label: "System", icon: DashboardSpeed01Icon },
		],
	},
	{ label: "Organization", items: [{ href: "/team", label: "Team", icon: UserGroupIcon }] },
];

/** The group whose links need no heading. */
export const MAIN_GROUP = "Workspace";

/** Reached from the account menu rather than the sidebar. */
export const ACCOUNT_PAGE: NavItem = { href: "/account", label: "Account", icon: UserCircleIcon };
