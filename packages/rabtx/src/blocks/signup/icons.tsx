import type { SVGProps } from "react";

// HugeIcons (MIT) glyphs, inlined so the blocks need no icon package. Decorative: aria-hidden.
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
			<path d="M20 21C19.713 17.269 16.729 14.315 12.995 14.066L12 14C11.645 14.01 11.313 14.023 11.001 14.038C7.3 14.219 4.284 17.306 4 21" />
			<circle cx="12" cy="7" r="4" />
		</Icon>
	);
}

export function MailIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M2 6L8.913 9.917C11.462 11.361 12.538 11.361 15.087 9.917L22 6" />
			<path d="M2.016 13.476C2.081 16.541 2.114 18.074 3.245 19.209C4.376 20.345 5.95 20.384 9.099 20.463C11.039 20.512 12.961 20.512 14.901 20.463C18.05 20.384 19.624 20.345 20.755 19.209C21.886 18.074 21.919 16.541 21.984 13.476C22.005 12.49 22.005 11.51 21.984 10.524C21.919 7.459 21.886 5.926 20.755 4.791C19.624 3.655 18.05 3.616 14.901 3.537C12.961 3.488 11.039 3.488 9.099 3.537C5.95 3.616 4.376 3.655 3.245 4.791C2.114 5.926 2.081 7.459 2.016 10.524C1.995 11.51 1.995 12.49 2.016 13.476Z" />
		</Icon>
	);
}

export function LockIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 14.5V17.5M13 14.5C13 15.052 12.552 15.5 12 15.5C11.448 15.5 11 15.052 11 14.5C11 13.948 11.448 13.5 12 13.5C12.552 13.5 13 13.948 13 14.5Z" />
			<path d="M16.5 9V6.5C16.5 4.015 14.485 2 12 2C9.515 2 7.5 4.015 7.5 6.5V9" />
			<path d="M4.268 18.845C4.493 20.515 5.876 21.824 7.56 21.901C8.976 21.966 10.415 22 12 22C13.585 22 15.024 21.966 16.44 21.901C18.124 21.824 19.507 20.515 19.732 18.845C19.879 17.755 20 16.638 20 15.5C20 14.362 19.879 13.245 19.732 12.155C19.507 10.485 18.124 9.176 16.44 9.099C15.024 9.034 13.585 9 12 9C10.415 9 8.976 9.034 7.56 9.099C5.876 9.176 4.493 10.485 4.268 12.155C4.121 13.245 4 14.362 4 15.5C4 16.638 4.121 17.755 4.268 18.845Z" />
		</Icon>
	);
}

export function ArrowLeftIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M15 6C15 6 9 10.419 9 12C9 13.581 15 18 15 18" />
		</Icon>
	);
}

export function ArrowRightIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M9 6C9 6 15 10.419 15 12C15 13.581 9 18 9 18" />
		</Icon>
	);
}

export function GoogleIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 12H17C17 14.761 14.761 17 12 17C9.239 17 7 14.761 7 12C7 9.239 9.239 7 12 7C13.381 7 14.631 7.56 15.536 8.464" />
		</Icon>
	);
}

export function GithubIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M10 20.568C6.571 21.725 3.714 20.568 2 17" />
			<path d="M10 22V18.758C10 18.16 10.184 17.64 10.48 17.17C10.684 16.848 10.545 16.39 10.177 16.289C7.134 15.453 5 14.108 5 9.646C5 8.486 5.38 7.396 6.048 6.446C6.214 6.21 6.297 6.092 6.317 5.985C6.337 5.878 6.303 5.739 6.233 5.459C5.95 4.323 5.969 3.116 6.393 2.028C6.393 2.028 7.27 1.742 9.267 2.99C9.723 3.274 9.951 3.417 10.152 3.449C10.352 3.481 10.621 3.414 11.157 3.28C11.891 3.098 12.648 3 13.5 3C14.352 3 15.109 3.098 15.843 3.28C16.379 3.414 16.648 3.481 16.849 3.449C17.049 3.417 17.277 3.274 17.733 2.99C19.73 1.742 20.607 2.028 20.607 2.028C21.031 3.116 21.05 4.323 20.767 5.459C20.697 5.739 20.663 5.878 20.683 5.985C20.703 6.092 20.786 6.21 20.952 6.446C21.62 7.396 22 8.486 22 9.646C22 14.108 19.866 15.453 16.823 16.289C16.456 16.39 16.316 16.848 16.52 17.17C16.816 17.64 17 18.16 17 18.758V22" />
		</Icon>
	);
}

/** A tick and the step number swap places in the progress dots. */
export function TickIcon(props: IconProps) {
	return (
		<Icon strokeWidth={2.25} {...props}>
			<path d="M5 12.5L9.5 17L19 7" pathLength={1} />
		</Icon>
	);
}
