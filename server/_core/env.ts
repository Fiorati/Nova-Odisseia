export const ENV = {
  appTitle: process.env.VITE_APP_TITLE ?? "Nova Odisseia: Fiorati",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? "stone.com.br",
};
