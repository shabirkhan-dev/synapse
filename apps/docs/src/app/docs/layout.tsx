import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { MessageCircleIcon } from "lucide-react";
import { cookies } from "next/headers";
import { AISearch, AISearchPanel, AISearchTrigger } from "@/components/ai/search";
import { LibraryFrame, LibraryProvider, ViewSwitch } from "@/components/rabtx/library";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default async function Layout({ children }: LayoutProps<"/docs">) {
	const jar = await cookies();
	const initial = jar.get("rabtx-docs-view")?.value === "ui" ? "ui" : "docs";
	const options = baseOptions();

	return (
		<LibraryProvider initial={initial}>
			<DocsLayout
				tree={source.getPageTree()}
				{...options}
				nav={{ ...options.nav, children: <ViewSwitch className="md:hidden" /> }}
			>
				<div className="sticky top-(--fd-docs-row-1) z-30 hidden h-12 items-center border-b bg-fd-background/80 px-4 backdrop-blur-sm [grid-area:header] md:flex md:layout:[--fd-header-height:--spacing(12)]">
					<ViewSwitch />
				</div>
				<AISearch>
					<AISearchPanel />
					<AISearchTrigger
						position="float"
						className={cn(
							buttonVariants({
								variant: "secondary",
								className: "text-fd-muted-foreground rounded-2xl",
							}),
						)}
					>
						<MessageCircleIcon className="size-4.5" />
						Ask AI
					</AISearchTrigger>
				</AISearch>
				<LibraryFrame>{children}</LibraryFrame>
			</DocsLayout>
		</LibraryProvider>
	);
}
