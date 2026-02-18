export function tgHaptic(type: "success" | "error" | "light" | "select") {
  const tg = (window as any).Telegram?.WebApp;
  const h = tg?.HapticFeedback;
  if (!h) return;

  if (type === "success") h.notificationOccurred("success");
  else if (type === "error") h.notificationOccurred("error");
  else if (type === "light") h.impactOccurred("light");
  else h.selectionChanged();
}