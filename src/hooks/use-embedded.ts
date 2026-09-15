// True when this page is running inside an iframe on a different page (e.g.
// the NOVAMOTIS webshop embedding the configurator at shop.novamotis.com).
// Used to hide this app's own header/footer chrome so it doesn't duplicate
// the embedding page's own navigation. See vercel.json's
// Content-Security-Policy frame-ancestors for which origins may embed us.
export function useIsEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws in some sandboxed contexts —
    // that itself only happens when framed, so treat it as embedded.
    return true;
  }
}
