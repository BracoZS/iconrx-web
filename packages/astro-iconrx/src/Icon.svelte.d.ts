import type { Component } from "svelte";
import type { SVGAttributes } from "svelte/elements";
import type { IconName } from "./index.js";

export type { IconName };

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "width" | "height"> {
  name: IconName;
  /** Any CSS size ("1.5rem", "24px") or a number (px). @default "1em" */
  size?: string | number;
  title?: string;
}

declare const Icon: Component<IconProps>;
export default Icon;
