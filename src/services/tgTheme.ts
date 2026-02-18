export type ThemeColors = {
  bg: string;
  text: string;
  hintBg: string;
};

function hexOr(fallback: string, v: any) {
  return typeof v === "string" && v.startsWith("#") ? v : fallback;
}

export function getThemeColors(): ThemeColors {
  const tg = (window as any).Telegram?.WebApp;
  const params = tg?.themeParams ?? {};

  const bg = hexOr("#5abcd4", params.bg_color);
  const text = hexOr("#0b1020", params.text_color);

  // простая подложка под текст (чтобы читалось на любом фоне)
  const hintBg = tg?.colorScheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return { bg, text, hintBg };
}

export function onThemeChanged(cb: () => void) {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.onEvent) return () => {};

  tg.onEvent("themeChanged", cb);
  return () => tg.offEvent?.("themeChanged", cb);
}