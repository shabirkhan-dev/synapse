import { Card, CardDescription, CardHeader, CardTitle, type CardSize } from "@rabtx/ui/card";

const sizes: [CardSize, string][] = [
	["sm", "12px padding"],
	["default", "16px padding"],
	["lg", "20px padding"],
];

export default function CardSizes() {
	return sizes.map(([size, padding]) => (
		<Card key={size} size={size} className="w-44">
			<CardHeader>
				<CardTitle>{size}</CardTitle>
				<CardDescription>{padding}</CardDescription>
			</CardHeader>
		</Card>
	));
}
