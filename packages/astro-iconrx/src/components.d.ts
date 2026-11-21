import type { HTMLAttributes } from "astro/types";
import type { IconName } from "./index.js";

export type { IconName };

export interface IconProps extends Omit<HTMLAttributes<"svg">, "width" | "height"> {
  name: IconName;
  /** Any CSS size ("1.5rem", "24px") or a number (px). @default "1em" */
  size?: string | number;
  title?: string;
}

export declare function Icon(_props: IconProps): any;
