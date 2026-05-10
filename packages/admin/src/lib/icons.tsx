/**
 * Backwards-compatible icon shim.
 *
 * `@hugeicons/react` switched in 1.x from per-icon component exports
 * (`<ArrowLeft01Icon />`) to a single `<HugeiconsIcon icon={...} />` renderer.
 * Most of the admin codebase still uses the per-icon component pattern, so
 * this module re-exports each used icon as a small functional component
 * that renders through the new API.
 *
 * To add a new icon: import its definition from `@hugeicons/core-free-icons`
 * below, then `export const FooIcon = wrap(FooIconDef);`.
 */

import type { ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon as Add01Def,
  RefreshIcon as RefreshDef,
  ArrowLeft01Icon as ArrowLeft01Def,
  ArrowRight01Icon as ArrowRight01Def,
  ArrowUp01Icon as ArrowUp01Def,
  ArrowDown01Icon as ArrowDown01Def,
  Loading01Icon as Loading01Def,
  Copy01Icon as Copy01Def,
  File02Icon as File02Def,
  File01Icon as File01Def,
  Database02Icon as Database02Def,
  Logout03Icon as Logout03Def,
  Delete01Icon as Delete01Def,
  PencilEdit01Icon as PencilEdit01Def,
  Search01Icon as Search01Def,
  FloppyDiskIcon as FloppyDiskDef,
  Upload04Icon as Upload04Def,
  Image01Icon as Image01Def,
  Home01Icon as Home01Def,
  Settings01Icon as Settings01Def,
  Cancel01Icon as Cancel01Def,
} from "@hugeicons/core-free-icons";

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, "icon">;
type IconDef = ComponentProps<typeof HugeiconsIcon>["icon"];

const wrap = (icon: IconDef) =>
  function Icon(props: IconProps) {
    return <HugeiconsIcon icon={icon} {...props} />;
  };

export const Add01Icon = wrap(Add01Def);
export const RefreshIcon = wrap(RefreshDef);
export const ArrowLeft01Icon = wrap(ArrowLeft01Def);
export const ArrowRight01Icon = wrap(ArrowRight01Def);
export const ArrowUp01Icon = wrap(ArrowUp01Def);
export const ArrowDown01Icon = wrap(ArrowDown01Def);
export const Loading01Icon = wrap(Loading01Def);
export const Copy01Icon = wrap(Copy01Def);
export const File02Icon = wrap(File02Def);
export const File01Icon = wrap(File01Def);
export const Database02Icon = wrap(Database02Def);
export const Logout03Icon = wrap(Logout03Def);
export const Delete01Icon = wrap(Delete01Def);
export const PencilEdit01Icon = wrap(PencilEdit01Def);
export const Search01Icon = wrap(Search01Def);
export const FloppyDiskIcon = wrap(FloppyDiskDef);
export const Upload04Icon = wrap(Upload04Def);
export const Image01Icon = wrap(Image01Def);
export const Home01Icon = wrap(Home01Def);
export const Settings01Icon = wrap(Settings01Def);
export const Cancel01Icon = wrap(Cancel01Def);
