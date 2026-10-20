export function setFlash(ctx, tone, text) {
  ctx.setCookie('lion_flash', JSON.stringify({ tone, text }), { maxAge: 30, path: '/' });
}
export function takeFlash(ctx) {
  const raw = ctx.cookies.lion_flash;
  if (!raw) return null;
  ctx.clearCookie('lion_flash');
  try { return JSON.parse(raw); } catch { return null; }
}
