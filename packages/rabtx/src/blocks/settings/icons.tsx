import type { SVGProps } from "react";

// Line glyphs in the HugeIcons style, inlined so the block needs no icon package. Decorative.
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			{children}
		</svg>
	);
}

export function UserIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="7.5" r="3.5" />
			<path d="M4.5 20c.6-3.6 3.7-6 7.5-6s6.9 2.4 7.5 6" />
		</Icon>
	);
}

export function KeyIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="8" cy="15" r="4.5" />
			<path d="M11.2 11.8L20 3M17 6l2.5 2.5M14.5 8.5L16.5 10.5" />
		</Icon>
	);
}

export function BellIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5.2 15.5c.9-1 1.3-2.2 1.3-3.6V10a5.5 5.5 0 0 1 11 0v1.9c0 1.4.4 2.6 1.3 3.6.5.6.1 1.5-.7 1.5H5.9c-.8 0-1.2-.9-.7-1.5Z" />
			<path d="M10 20a2.2 2.2 0 0 0 4 0" />
		</Icon>
	);
}

export function PaletteIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.5-3.8 3.5h-1.7c-1 0-1.8.8-1.8 1.8 0 .5.2.9.5 1.2.3.3.5.7.5 1.2 0 .7-.6 1.3-1.3 1.3H12Z" />
			<circle cx="7.5" cy="11" r="1" />
			<circle cx="10.5" cy="7" r="1" />
			<circle cx="15" cy="7.5" r="1" />
		</Icon>
	);
}

export function AlertIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10.3 4.2c.8-1.4 2.6-1.4 3.4 0l7 12.3c.8 1.4-.2 3-1.7 3H5c-1.5 0-2.5-1.6-1.7-3l7-12.3Z" />
			<path d="M12 9.5v4M12 16.5v.01" />
		</Icon>
	);
}

export function MailIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="2.5" y="4.5" width="19" height="15" rx="3" />
			<path d="M3 7l7.1 4.6c1.2.8 2.6.8 3.8 0L21 7" />
		</Icon>
	);
}

export function GlobeIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="9" />
			<path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
		</Icon>
	);
}

export function ClockIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7.5V12l3 2" />
		</Icon>
	);
}

export function LinkIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7l-1 1" />
			<path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1-1" />
		</Icon>
	);
}

export function TrashIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 6.5h16M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
			<path d="M6 6.5l.8 11.6A2 2 0 0 0 8.8 20h6.4a2 2 0 0 0 2-1.9L18 6.5M10 10.5v5.5M14 10.5v5.5" />
		</Icon>
	);
}
