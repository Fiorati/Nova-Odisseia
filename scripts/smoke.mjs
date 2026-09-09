const base = process.env.SMOKE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const checks = [
  ["healthz", "/healthz"],
  ["root", "/"],
  ["trpc identity", "/api/trpc/identity.configuration"],
];
let failed = false;
for (const [name, path] of checks) {
  try {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    const ok = res.status >= 200 && res.status < 500;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${res.status}`);
    if (!ok) failed = true;
  } catch (error) {
    console.error(`FAIL ${name}:`, error?.message || error);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
