<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";
  import type { IconName } from "./types.generated";
  // @ts-ignore - resolved by the astro-iconrx Vite plugin
  import { getIconSync, fallback, iconrxConfig } from "virtual:iconrx";

  interface $$Props extends Omit<SVGAttributes<SVGSVGElement>, "width" | "height"> {
    name: IconName;
    /** Any CSS size ("1.5rem", "24px") or a number (px). Defaults to "1em" (matches the text size). */
    size?: string | number;
    title?: string;
    class?: string;
  }

  export let name: IconName;
  export let size: string | number = iconrxConfig.size;
  export let title: string | undefined = undefined;

  $: icon = name ? getIconSync(name) : null;
  $: isFallback = !icon;

  $: if (name && isFallback && import.meta.env.DEV) {
    console.warn(`[iconrx] "${name}" not found in /${iconrxConfig.dir}`);
  }

  $: ({ attrs, innerHTML } = icon ?? fallback);

  $: hasLabel = Boolean(
    title || $$restProps["aria-label"] || $$restProps["aria-labelledby"]
  );

  $: a11yAttrs = hasLabel
    ? { role: "img" as const }
    : { "aria-hidden": "true" as const, focusable: "false" as const };

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  $: finalInnerHTML = title
    ? `<title>${escapeHtml(title)}</title>${innerHTML}`
    : innerHTML;
</script>

<svg
  width={size}
  height={size}
  {...attrs}
  {...a11yAttrs}
  {...$$restProps}
>
  {@html finalInnerHTML}
</svg>
