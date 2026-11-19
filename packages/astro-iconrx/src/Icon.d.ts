import type { HTMLAttributes } from "astro/types";
import type { IconName } from "./types.generated";

export type { IconName };

export interface Props extends Omit<HTMLAttributes<"svg">, "width" | "height"> {
  name: IconName;
  /** Any CSS size ("1.5rem", "24px") or a number (px). @default "1em" */
  size?: string | number;
  title?: string;
}

declare function Icon(_props: Props): any;
export default Icon;
export { Icon };
