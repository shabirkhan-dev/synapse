import { Switch } from "@rabtx/ui/switch";

export default function SwitchRtl() {
	return (
		<div dir="rtl" className="grid gap-3">
			<Switch defaultChecked>الإشعارات</Switch>
			<Switch>الوضع الداكن</Switch>
		</div>
	);
}
