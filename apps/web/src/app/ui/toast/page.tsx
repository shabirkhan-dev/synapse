import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import ToastAction from "./_examples/action";
import ToastDefault from "./_examples/default";
import ToastDialog from "./_examples/dialog";
import ToastOptions from "./_examples/options";
import ToastPositions from "./_examples/positions";
import ToastPromise from "./_examples/promise";
import ToastTypes from "./_examples/types";

export default function ToastPage() {
	return (
		<Doc>
			<h1>Toast</h1>
			<p>
				A stacked toast region in the top layer (<code>popover=&quot;manual&quot;</code>), filled by{" "}
				<code>toast()</code> from anywhere. Hover or focus fans the stack out; swipe or Escape
				dismisses. Every movement is CSS.
			</p>
			<Example file="toast/_examples/default.tsx">
				<ToastDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Toaster, toast } from "@rabtx/ui/toast";\n\n// once, in the root layout\n<Toaster />\n\n// anywhere\ntoast("Event created", {\n\tdescription: "Sunday at 9:00",\n\taction: { label: "Undo", onClick: undo },\n});`}</pre>
			<p>
				A second <code>Toaster</code> with the same <code>id</code> stays empty, so each example
				here can render its own.
			</p>

			<h2>Types</h2>
			<p>
				Success, info, warning and error tint the icon; errors are announced at once. Loading spins
				until it is updated with the same <code>id</code>.
			</p>
			<Example file="toast/_examples/types.tsx">
				<ToastTypes />
			</Example>

			<h2>Promise</h2>
			<p>Loading, then success or error when the promise settles.</p>
			<Example file="toast/_examples/promise.tsx">
				<ToastPromise />
			</Example>

			<h2>Action and cancel</h2>
			<p>
				Our <code>Button</code>, primary and ghost. Either dismisses the toast unless its handler
				calls <code>preventDefault()</code>.
			</p>
			<Example file="toast/_examples/action.tsx">
				<ToastAction />
			</Example>

			<h2>Positions</h2>
			<p>
				Six positions; <code>expand</code> keeps the stack fanned out, <code>visibleToasts</code>{" "}
				caps it and <code>gap</code> spaces it.
			</p>
			<Example file="toast/_examples/positions.tsx">
				<ToastPositions />
			</Example>

			<h2>Above a dialog</h2>
			<p>The region climbs back on top of a dialog when it opens.</p>
			<Example file="toast/_examples/dialog.tsx">
				<ToastDialog />
			</Example>

			<h2>Duration, icon, dismissal</h2>
			<Example file="toast/_examples/options.tsx">
				<ToastOptions />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["position", "top|bottom-left|center|right", "Default bottom-right."],
					["expand", "boolean", "Always fanned out. Default false."],
					["visibleToasts", "number", "Shown at once; the rest wait. Default 3."],
					["gap", "number", "Px between fanned-out toasts. Default 14."],
					["offset", "number | string", "Distance from the edges. Default 24."],
					["duration", "number", "Default ms on screen. Default 4000."],
					["closeButton", "boolean", "Default true."],
					["hotkey", "string[]", 'Focus the newest toast. Default ["F6", "Alt+T"].'],
					["id", "string", "Pairs with toast(…, { toaster })."],
				]}
			/>
			<p>
				<code>toast(title, options)</code>, <code>toast.success</code>, <code>.error</code>,{" "}
				<code>.warning</code>, <code>.info</code>, <code>.loading</code>, <code>.promise</code> and{" "}
				<code>.dismiss(id?)</code>. Options:
			</p>
			<PropsTable
				rows={[
					["id", "string | number", "Update that toast in place."],
					["description", "ReactNode", ""],
					["action / cancel", "{ label, onClick? }", "Primary and ghost Buttons."],
					["duration", "number", "Ms; Infinity stays."],
					["icon", "ReactNode", "Replaces the type's icon; null hides it."],
					["dismissible", "boolean", "false: no close, swipe or Escape."],
					["important", "boolean", "Announce assertively."],
					["onDismiss / onAutoClose", "(toast) => void", ""],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A <code>section</code> landmark named &quot;Notifications (F6)&quot;; F6 or Alt+T focuses
					the newest toast and Escape dismisses the focused one.
				</li>
				<li>Polite live region for most toasts, assertive for errors.</li>
				<li>Timers pause on hover, focus and a hidden tab.</li>
				<li>Reduced motion and Motion off show and hide toasts at once.</li>
			</ul>
		</Doc>
	);
}
