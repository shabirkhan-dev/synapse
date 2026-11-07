import { MagneticButton } from "@rabtx/ui/button";

export default function ButtonMagnetic() {
	return (
		<>
			<MagneticButton>Follow me</MagneticButton>
			<MagneticButton variant="outline" strength={0.4}>
				Stronger pull
			</MagneticButton>
		</>
	);
}
