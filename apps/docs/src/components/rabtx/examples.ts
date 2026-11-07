import type { ComponentType } from "react";
import AccordionControlled from "./examples/accordion/controlled";
import AccordionDefault from "./examples/accordion/default";
import AccordionFlush from "./examples/accordion/flush";
import AccordionModes from "./examples/accordion/modes";
import AccordionMultiple from "./examples/accordion/multiple";
import AccordionStates from "./examples/accordion/states";
import AccordionVariants from "./examples/accordion/variants";
import CommandBlockExample from "./examples/blocks/command";
import CommandInlineExample from "./examples/blocks/command-inline";
import CommandSearchExample from "./examples/blocks/command-search";
import SettingsBlockExample from "./examples/blocks/settings";
import SettingsBlockNarrow from "./examples/blocks/settings-narrow";
import SigninBlockExample from "./examples/blocks/signin";
import SignupBlockExample from "./examples/blocks/signup";
import ButtonDisabled from "./examples/button/disabled";
import ButtonIcons from "./examples/button/icons";
import ButtonLinkExample from "./examples/button/link";
import ButtonMagnetic from "./examples/button/magnetic";
import ButtonMetallic from "./examples/button/metallic";
import ButtonModes from "./examples/button/modes";
import ButtonRipple from "./examples/button/ripple";
import ButtonSizes from "./examples/button/sizes";
import ButtonStates from "./examples/button/states";
import ButtonVariants from "./examples/button/variants";
import CollapsibleControlled from "./examples/collapsible/controlled";
import CollapsibleDefault from "./examples/collapsible/default";
import CheckboxControlled from "./examples/checkbox/controlled";
import CheckboxDefault from "./examples/checkbox/default";
import CheckboxDescription from "./examples/checkbox/description";
import CheckboxIndeterminate from "./examples/checkbox/indeterminate";
import CheckboxModes from "./examples/checkbox/modes";
import CheckboxSizes from "./examples/checkbox/sizes";
import CheckboxStates from "./examples/checkbox/states";
import DialogDefault from "./examples/dialog/default";
import DialogForm from "./examples/dialog/form";
import DialogDestructive from "./examples/dialog/destructive";
import DialogSizes from "./examples/dialog/sizes";
import DialogMorph from "./examples/dialog/morph";
import DialogSheet from "./examples/dialog/sheet";
import DialogScrollable from "./examples/dialog/scrollable";
import DialogNested from "./examples/dialog/nested";
import TooltipDefault from "./examples/tooltip/default";
import TooltipSides from "./examples/tooltip/sides";
import TooltipAlignment from "./examples/tooltip/align";
import TooltipToolbar from "./examples/tooltip/toolbar";
import TooltipControlled from "./examples/tooltip/controlled";
import TooltipInline from "./examples/tooltip/inline";
import DropdownMenuActions from "./examples/dropdown-menu/actions";
import DropdownMenuCheckboxes from "./examples/dropdown-menu/checkboxes";
import ContextMenuExample from "./examples/dropdown-menu/context-menu";
import DropdownMenuDefault from "./examples/dropdown-menu/default";
import DropdownMenuRadio from "./examples/dropdown-menu/radio";
import PopoverAlignExample from "./examples/popover/align";
import PopoverControlled from "./examples/popover/close";
import PopoverDefault from "./examples/popover/default";
import PopoverSides from "./examples/popover/sides";
import InputAddons from "./examples/input/addons";
import InputAlignment from "./examples/input/alignment";
import InputDefault from "./examples/input/default";
import InputFloating from "./examples/input/floating";
import InputIcons from "./examples/input/icons";
import InputOtp from "./examples/input/otp";
import InputPassword from "./examples/input/password";
import InputSearch from "./examples/input/search";
import InputSizes from "./examples/input/sizes";
import InputStates from "./examples/input/states";
import InputVariants from "./examples/input/variants";
import CardDefault from "./examples/card/default";
import CardExpandable from "./examples/card/expandable";
import CardLink from "./examples/card/link";
import CardMedia from "./examples/card/media";
import CardModes from "./examples/card/modes";
import CardSelectable from "./examples/card/selectable";
import CardSizes from "./examples/card/sizes";
import CardSpotlight from "./examples/card/spotlight";
import CardStackExample from "./examples/card/stack";
import CardTilt from "./examples/card/tilt";
import RadioGroupCards from "./examples/radio-group/cards";
import RadioGroupControlled from "./examples/radio-group/controlled";
import RadioGroupDefault from "./examples/radio-group/default";
import RadioGroupDescription from "./examples/radio-group/description";
import RadioGroupHorizontal from "./examples/radio-group/horizontal";
import RadioGroupModes from "./examples/radio-group/modes";
import RadioGroupSizes from "./examples/radio-group/sizes";
import RadioGroupStates from "./examples/radio-group/states";
import SelectControlled from "./examples/select/controlled";
import SelectDefault from "./examples/select/default";
import SelectGroups from "./examples/select/groups";
import SelectIcons from "./examples/select/icons";
import SelectNative from "./examples/select/native";
import SelectPlacement from "./examples/select/placement";
import SelectSizes from "./examples/select/sizes";
import SelectStates from "./examples/select/states";
import SliderBubble from "./examples/slider/bubble";
import SliderControlled from "./examples/slider/controlled";
import SliderDefault from "./examples/slider/default";
import SliderForm from "./examples/slider/form";
import SliderMarks from "./examples/slider/marks";
import SliderModes from "./examples/slider/modes";
import SliderRtl from "./examples/slider/rtl";
import SliderRuler from "./examples/slider/ruler";
import SliderSizes from "./examples/slider/sizes";
import SliderStates from "./examples/slider/states";
import SliderVertical from "./examples/slider/vertical";
import SwitchControlled from "./examples/switch/controlled";
import SwitchDefault from "./examples/switch/default";
import SwitchField from "./examples/switch/field";
import SwitchModes from "./examples/switch/modes";
import SwitchRows from "./examples/switch/rows";
import SwitchRtl from "./examples/switch/rtl";
import SwitchSizes from "./examples/switch/sizes";
import SwitchStates from "./examples/switch/states";
import TabsControlled from "./examples/tabs/controlled";
import TabsDefault from "./examples/tabs/default";
import TabsExpandable from "./examples/tabs/expandable";
import TabsManual from "./examples/tabs/manual";
import TabsModes from "./examples/tabs/modes";
import TabsOverflow from "./examples/tabs/overflow";
import TabsPill from "./examples/tabs/pill";
import TabsRtl from "./examples/tabs/rtl";
import TabsSizes from "./examples/tabs/sizes";
import TabsStates from "./examples/tabs/states";
import TabsUnderline from "./examples/tabs/underline";
import TabsVariants from "./examples/tabs/variants";
import TabsVertical from "./examples/tabs/vertical";
import ToastDefault from "./examples/toast/default";
import ToastTypes from "./examples/toast/types";
import ToastPromise from "./examples/toast/promise";
import ToastAction from "./examples/toast/action";
import ToastPositions from "./examples/toast/positions";
import ToastDialog from "./examples/toast/dialog";
import ToastOptions from "./examples/toast/options";

/** Every live example, by the path of its file under `examples/` without the extension. */
export const examples = {
	"button/variants": ButtonVariants,
	"button/sizes": ButtonSizes,
	"button/icons": ButtonIcons,
	"button/states": ButtonStates,
	"button/disabled": ButtonDisabled,
	"button/ripple": ButtonRipple,
	"button/link": ButtonLinkExample,
	"button/magnetic": ButtonMagnetic,
	"button/metallic": ButtonMetallic,
	"button/modes": ButtonModes,
	"checkbox/default": CheckboxDefault,
	"checkbox/sizes": CheckboxSizes,
	"checkbox/description": CheckboxDescription,
	"checkbox/indeterminate": CheckboxIndeterminate,
	"checkbox/states": CheckboxStates,
	"checkbox/controlled": CheckboxControlled,
	"checkbox/modes": CheckboxModes,
	"input/default": InputDefault,
	"input/sizes": InputSizes,
	"input/alignment": InputAlignment,
	"input/variants": InputVariants,
	"input/icons": InputIcons,
	"input/addons": InputAddons,
	"input/search": InputSearch,
	"input/password": InputPassword,
	"input/floating": InputFloating,
	"input/states": InputStates,
	"input/otp": InputOtp,
	"select/default": SelectDefault,
	"select/sizes": SelectSizes,
	"select/icons": SelectIcons,
	"select/groups": SelectGroups,
	"select/states": SelectStates,
	"select/controlled": SelectControlled,
	"select/native": SelectNative,
	"select/placement": SelectPlacement,
	"switch/default": SwitchDefault,
	"switch/sizes": SwitchSizes,
	"switch/states": SwitchStates,
	"switch/field": SwitchField,
	"switch/controlled": SwitchControlled,
	"switch/rows": SwitchRows,
	"switch/rtl": SwitchRtl,
	"switch/modes": SwitchModes,
	"slider/default": SliderDefault,
	"slider/sizes": SliderSizes,
	"slider/bubble": SliderBubble,
	"slider/marks": SliderMarks,
	"slider/ruler": SliderRuler,
	"slider/vertical": SliderVertical,
	"slider/states": SliderStates,
	"slider/controlled": SliderControlled,
	"slider/form": SliderForm,
	"slider/rtl": SliderRtl,
	"slider/modes": SliderModes,
	"tabs/default": TabsDefault,
	"tabs/variants": TabsVariants,
	"tabs/sizes": TabsSizes,
	"tabs/pill": TabsPill,
	"tabs/underline": TabsUnderline,
	"tabs/expandable": TabsExpandable,
	"tabs/vertical": TabsVertical,
	"tabs/manual": TabsManual,
	"tabs/states": TabsStates,
	"tabs/controlled": TabsControlled,
	"tabs/overflow": TabsOverflow,
	"tabs/rtl": TabsRtl,
	"tabs/modes": TabsModes,
	"accordion/default": AccordionDefault,
	"accordion/variants": AccordionVariants,
	"accordion/multiple": AccordionMultiple,
	"accordion/flush": AccordionFlush,
	"accordion/states": AccordionStates,
	"accordion/controlled": AccordionControlled,
	"accordion/modes": AccordionModes,
	"collapsible/default": CollapsibleDefault,
	"collapsible/controlled": CollapsibleControlled,
	"card/default": CardDefault,
	"card/sizes": CardSizes,
	"card/media": CardMedia,
	"card/link": CardLink,
	"card/selectable": CardSelectable,
	"card/tilt": CardTilt,
	"card/spotlight": CardSpotlight,
	"card/expandable": CardExpandable,
	"card/stack": CardStackExample,
	"card/modes": CardModes,
	"radio-group/default": RadioGroupDefault,
	"radio-group/sizes": RadioGroupSizes,
	"radio-group/description": RadioGroupDescription,
	"radio-group/horizontal": RadioGroupHorizontal,
	"radio-group/cards": RadioGroupCards,
	"radio-group/states": RadioGroupStates,
	"radio-group/controlled": RadioGroupControlled,
	"radio-group/modes": RadioGroupModes,
	"dialog/default": DialogDefault,
	"dialog/form": DialogForm,
	"dialog/destructive": DialogDestructive,
	"dialog/sizes": DialogSizes,
	"dialog/morph": DialogMorph,
	"dialog/sheet": DialogSheet,
	"dialog/scrollable": DialogScrollable,
	"dialog/nested": DialogNested,
	"tooltip/default": TooltipDefault,
	"tooltip/sides": TooltipSides,
	"tooltip/align": TooltipAlignment,
	"tooltip/toolbar": TooltipToolbar,
	"tooltip/controlled": TooltipControlled,
	"tooltip/inline": TooltipInline,
	"popover/default": PopoverDefault,
	"popover/sides": PopoverSides,
	"popover/align": PopoverAlignExample,
	"popover/close": PopoverControlled,
	"dropdown-menu/default": DropdownMenuDefault,
	"dropdown-menu/actions": DropdownMenuActions,
	"dropdown-menu/checkboxes": DropdownMenuCheckboxes,
	"dropdown-menu/radio": DropdownMenuRadio,
	"dropdown-menu/context-menu": ContextMenuExample,
	"toast/default": ToastDefault,
	"toast/types": ToastTypes,
	"toast/promise": ToastPromise,
	"toast/action": ToastAction,
	"toast/positions": ToastPositions,
	"toast/dialog": ToastDialog,
	"toast/options": ToastOptions,
	"blocks/signup": SignupBlockExample,
	"blocks/signin": SigninBlockExample,
	"blocks/command": CommandBlockExample,
	"blocks/command-inline": CommandInlineExample,
	"blocks/command-search": CommandSearchExample,
	"blocks/settings": SettingsBlockExample,
	"blocks/settings-narrow": SettingsBlockNarrow,
} satisfies Record<string, ComponentType>;

export type ExampleName = keyof typeof examples;
