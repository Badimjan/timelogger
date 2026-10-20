// Central place for server settings; every value can be overridden from the environment.
export const config = {
  adoBase: process.env.ADO_BASE ?? "https://damavandscm/tfs",
  collection: process.env.ADO_COLLECTION ?? "Sepidar",
  logApiBase: process.env.LOG_API_BASE ?? "https://damavandscm:8081/api",
  domain: process.env.AD_DOMAIN ?? "SYSTEMGROUP",
  extensionPublisher: "SystemGroup",
  extensionName: "sg-azure-time-logging-extension",
  dbPath: process.env.DB_PATH ?? "data/timelogger.db",
  // The cookie is only marked Secure when the app is served over HTTPS.
  cookieSecure: process.env.COOKIE_SECURE === "1",
  sessionHours: 12,
  rememberDays: 30,
};

export const collectionUrl = `${config.adoBase}/${config.collection}`;
