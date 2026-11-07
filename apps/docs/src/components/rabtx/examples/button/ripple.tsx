import { Button } from "@rabtx/ui/button";

export default function ButtonRipple() {
	return (
		<>
			<Button ripple>Press me</Button>
			<Button variant="secondary" ripple pressScale={0.97}>
				Gentle press
			</Button>
		</>
	);
}
