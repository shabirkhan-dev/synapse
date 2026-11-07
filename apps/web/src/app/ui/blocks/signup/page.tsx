import { Doc } from "../../_components/doc";
import { Example } from "../../_components/example";
import { PropsTable } from "../../_components/props-table";
import SigninBlockExample from "./_examples/signin";
import SignupBlockExample from "./_examples/signup";

export default function SignupBlockPage() {
	return (
		<Doc>
			<h1>Sign-up block</h1>
			<p>
				A three-step sign-up in a Card, made only of Rabtx components: details, an emailed code,
				then done. One native form with the browser&apos;s constraints, errors through Field, and
				steps that slide in CSS. Nothing is sent; wire the callbacks to your API.
			</p>
			<Example file="blocks/signup/_examples/signup.tsx" muted>
				<SignupBlockExample />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { SignupBlock } from "@rabtx/ui/blocks/signup";\n\n<SignupBlock\n\tonSubmit={async (values) => { /* create the account, email a code */ }}\n\tonVerify={async (code, values) => { /* return a message to reject it */ }}\n\tonResend={async (values) => { /* send a new code */ }}\n\tonFinish={() => router.push("/dashboard")}\n/>`}</pre>
			<p>
				<code>onSubmit</code> can return field errors to stay on the step, or throw to show a form
				error. <code>onVerify</code> returns a message to reject the code. Without them the block
				waits a moment so the flow can be tried.
			</p>

			<h2>Sign-in</h2>
			<p>
				A compact card in the same block: social buttons, email, password, remember me. Any password
				but &quot;correct horse&quot; shows the form error.
			</p>
			<Example file="blocks/signup/_examples/signin.tsx" muted>
				<SigninBlockExample />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["onSubmit", "(values) => SignupErrors | void", "Step 1. Return field errors, or throw."],
					["onVerify", "(code, values) => string | void", "Step 2. Return a message to reject."],
					["onResend", "(values) => void", "Send a new code."],
					["onFinish", "(values, { restart }) => void", "The last step's button."],
					["codeLength", "number", "Digits in the code. Default 6."],
					["resendSeconds", "number", "Before Resend unlocks. Default 30."],
					["roles, countries", "{ value, label }[]", "The two Selects' options."],
					["footer", "ReactNode", "Under the steps, such as a sign-in link."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Each step is a fieldset named by its heading; the heading takes focus when it opens.
				</li>
				<li>A polite live region names each new step; the progress marks the current one.</li>
				<li>Continue focuses the first invalid field; errors are the Field description.</li>
				<li>Reduced motion and Motion off switch steps at once.</li>
			</ul>
		</Doc>
	);
}
