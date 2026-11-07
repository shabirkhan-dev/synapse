"use client";

import { Tabs, TabsList, TabsTrigger } from "@rabtx/ui/tabs";
import { useState } from "react";

export default function TabsControlled() {
	const [plan, setPlan] = useState("monthly");
	return (
		<div className="grid justify-items-center gap-3">
			<Tabs value={plan} onValueChange={setPlan}>
				<TabsList variant="pill" aria-label="Billing period">
					<TabsTrigger value="monthly">Monthly</TabsTrigger>
					<TabsTrigger value="yearly">Yearly</TabsTrigger>
				</TabsList>
			</Tabs>
			<p className="text-sm text-muted-foreground">Billed {plan}</p>
		</div>
	);
}
