<script module lang="ts">
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
</script>

<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";
  import { iconMap, type IconName, fallback } from "./iconMap";

  interface Props extends Omit<SVGAttributes<SVGSVGElement>, "width" | "height"> {
    name: IconName;
    size?: string | number;
    title?: string;
  }

  let { name, size = "1em", title, ...rest }: Props = $props();

  const icon = $derived(name ? iconMap[name] : undefined);
  const isFallback = $derived(!icon);

  $effect(() => {
    if (name && isFallback && import.meta.env.DEV) {
      console.warn(`[Icon] "${name}" not found in /src/assets/icons`);
    }
  });

  const current = $derived(icon ?? fallback);

  const hasLabel = $derived(
    Boolean(title || rest["aria-label"] || rest["aria-labelledby"])
  );

  const a11yAttrs = $derived(
    hasLabel
      ? { role: "img" as const }
      : { "aria-hidden": "true" as const, focusable: "false" as const }
  );

  const finalInnerHTML = $derived(
    title
      ? `<title>${escapeHtml(title)}</title>${current.innerHTML}`
      : current.innerHTML
  );
</script>

<svg
  width={size}
  height={size}
  {...current.attrs}
  {...a11yAttrs}
  {...rest}
>
  {@html finalInnerHTML}
</svg>
