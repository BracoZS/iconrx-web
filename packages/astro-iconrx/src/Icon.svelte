<script>
  import { getIconSync, fallback, iconrxConfig } from "virtual:iconrx";

  let { name, size = iconrxConfig.size, title, ...rest } = $props();

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let icon = $derived(name ? getIconSync(name) : null);
  let { attrs, innerHTML } = $derived(icon ?? fallback);
  let hasLabel = $derived(
    Boolean(title || rest["aria-label"] || rest["aria-labelledby"])
  );
  let a11yAttrs = $derived(
    hasLabel
      ? { role: "img" }
      : { "aria-hidden": "true", focusable: "false" }
  );
  let finalInnerHTML = $derived(
    title ? `<title>${escapeHtml(title)}</title>${innerHTML}` : innerHTML
  );

  $effect(() => {
    if (name && !icon && import.meta.env.DEV) {
      console.warn(`[iconrx] "${name}" not found in /${iconrxConfig.dir}`);
    }
  });
</script>

<svg
  width={size}
  height={size}
  {...attrs}
  {...a11yAttrs}
  {...rest}
>
  {@html finalInnerHTML}
</svg>
