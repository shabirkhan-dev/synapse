import { MetallicButton } from "@rabtx/ui/button";

export default function ButtonMetallic() {
	return (
		<>
			<MetallicButton>Get early access</MetallicButton>
			<MetallicButton size="lg" paused>
				Paused chrome
			</MetallicButton>
		</>
	);
}
