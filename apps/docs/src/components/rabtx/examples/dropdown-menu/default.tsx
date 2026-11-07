import {
	CreditCardIcon,
	KeyboardIcon,
	Logout03Icon,
	Mail01Icon,
	Message01Icon,
	PlusSignIcon,
	Settings01Icon,
	UserAdd01Icon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@rabtx/ui/dropdown-menu";

export default function DropdownMenuDefault() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary">My account</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Ada Lovelace</DropdownMenuLabel>
					<DropdownMenuItem icon={<HugeiconsIcon icon={UserIcon} />} shortcut="⇧⌘P">
						Profile
					</DropdownMenuItem>
					<DropdownMenuItem icon={<HugeiconsIcon icon={CreditCardIcon} />} shortcut="⌘B">
						Billing
					</DropdownMenuItem>
					<DropdownMenuItem icon={<HugeiconsIcon icon={Settings01Icon} />} shortcut="⌘,">
						Settings
					</DropdownMenuItem>
					<DropdownMenuItem icon={<HugeiconsIcon icon={KeyboardIcon} />} disabled>
						Keyboard shortcuts
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger icon={<HugeiconsIcon icon={UserAdd01Icon} />}>
							Invite people
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem icon={<HugeiconsIcon icon={Mail01Icon} />}>Email</DropdownMenuItem>
							<DropdownMenuItem icon={<HugeiconsIcon icon={Message01Icon} />}>
								Message
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>More…</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem icon={<HugeiconsIcon icon={PlusSignIcon} />} shortcut="⌘T">
						New team
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem icon={<HugeiconsIcon icon={Logout03Icon} />} shortcut="⇧⌘Q">
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
