export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Kept for backwards compatibility with shared components; auth is local now. */
export const startLogin = () => {
  window.location.reload();
};
