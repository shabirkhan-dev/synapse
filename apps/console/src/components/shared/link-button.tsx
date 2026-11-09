import { buttonVariants } from "@synapse/ui/components/button";
import Link from "next/link";
import type { ComponentProps } from "react";

/** A navigation link that looks like a button (a real `<a>`, so it opens in a new tab too). */
export function LinkButton({
	variant,
	className,
	...props
}: ComponentProps<typeof Link> & {
	variant?: NonNullable<Parameters<typeof buttonVariants>[0]>["variant"];
}) {
	return <Link className={buttonVariants({ variant, size: "lg", className })} {...props} />;
}
