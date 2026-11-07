import { Badge } from "@rabtx/ui/badge";
import { CardDescription, CardHeader, CardTitle, TiltCard } from "@rabtx/ui/card";

export default function CardTilt() {
	return (
		<>
			<TiltCard size="lg" className="w-64">
				<CardHeader>
					<Badge tone="violet" className="mb-2 justify-self-start">
						Premium
					</Badge>
					<CardTitle as="h3">Tilt me</CardTitle>
					<CardDescription>The card leans toward the pointer, with a soft glare.</CardDescription>
				</CardHeader>
			</TiltCard>
			<TiltCard size="lg" max={20} glare={false} className="w-64">
				<CardHeader>
					<CardTitle as="h3">Steeper, no glare</CardTitle>
					<CardDescription>max is 20 degrees at a corner.</CardDescription>
				</CardHeader>
			</TiltCard>
		</>
	);
}
