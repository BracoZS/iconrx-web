import type { AstroIntegration } from "astro";
export type { IconName } from "./Icon";

/**
 * All options are optional. Missing ones are read from the "iconrx" field in your
 * package.json (the same one used by the `iconrx` CLI), then from the defaults.
 */
export interface IconRxOptions {
  /**
   * Folder where your local .svg files are stored.
   * @default "src/assets/icons"
   */
  dir?: string;
  /**
   * Iconify collection used when no prefix is given (e.g. "lucide", "tabler", "mdi").
   * @default "lucide"
   */
  set?: string;
  /**
   * Default icon size when no `size` prop is passed ("1.5rem", "24px", or a number in px).
   * @default "1em"
   */
  size?: string | number;
  /**
   * During `astro dev`, automatically download any `<Icon name="..." />` that doesn't exist locally yet.
   * @default true
   */
  autoFetch?: boolean;
}

export default function iconrx(options?: IconRxOptions): AstroIntegration;
