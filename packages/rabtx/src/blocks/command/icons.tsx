import type { SVGProps } from "react";

// HugeIcons (MIT) glyphs, inlined so the block needs no icon package. Decorative: aria-hidden.
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

export function SearchIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M17 17L21 21" />
			<path d="M19 11C19 6.582 15.418 3 11 3C6.582 3 3 6.582 3 11C3 15.418 6.582 19 11 19C15.418 19 19 15.418 19 11Z" />
		</Icon>
	);
}

export function ChevronRightIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M9 6C9 6 15 10.419 15 12C15 13.581 9 18 9 18" />
		</Icon>
	);
}

export function ChevronLeftIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M15 6C15 6 9 10.419 9 12C9 13.581 15 18 15 18" />
		</Icon>
	);
}

export function ClockIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 8V12L14 14" />
		</Icon>
	);
}

export function ArrowUpIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M18 15C18 15 13.581 9 12 9C10.419 9 6 15 6 15" />
		</Icon>
	);
}

export function ArrowDownIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M18 9C18 9 13.581 15 12 15C10.419 15 6 9 6 9" />
		</Icon>
	);
}

/** The Return key. */
export function EnterIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M11 6H15.5C17.985 6 20 8.015 20 10.5C20 12.985 17.985 15 15.5 15H4" />
			<path d="M7 12C7 12 4 14.21 4 15C4 15.791 7 18 7 18" />
		</Icon>
	);
}
