import { Tabs, TabsList, TabsTrigger } from "@rabtx/ui/tabs";

/** Right to left: the row starts at the right and the left and right arrows swap. */
export default function TabsRtl() {
	return (
		<div dir="rtl">
			<Tabs defaultValue="inbox">
				<TabsList variant="underline" aria-label="البريد">
					<TabsTrigger value="inbox">الوارد</TabsTrigger>
					<TabsTrigger value="sent">المرسل</TabsTrigger>
					<TabsTrigger value="drafts">المسودات</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
