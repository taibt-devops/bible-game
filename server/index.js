// Khởi động máy chủ Manna. Cấu hình bằng biến môi trường (xem deploy/manna.env.example).
import http from "node:http";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";
import { createApp } from "./app.js";
import { loadBible } from "./bible.js";
import { createGoogleVerifier } from "./google.js";

const env = process.env;
const production = env.NODE_ENV === "production";
const config = {
  port: Number(env.PORT || 8787),
  host: env.HOST || (production ? "127.0.0.1" : "0.0.0.0"),
  dbPath: env.DB_PATH || "data/manna.db",
  googleClientId: env.GOOGLE_CLIENT_ID || "",
  originSecret: env.ORIGIN_SECRET || "",
  publicOrigin: env.PUBLIC_ORIGIN || "",
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE !== "0" : production,
  serveStatic: env.SERVE_STATIC ? env.SERVE_STATIC === "1" : !production,
  staticRoot: fileURLToPath(new URL("..", import.meta.url)),
  proxyHops: Number(env.PROXY_HOPS || 0),
  sessionDays: Number(env.SESSION_DAYS || 90),
};

const db = openDb(config.dbPath);
const app = createApp({
  db,
  config,
  bible: loadBible(),
  verifyGoogle: createGoogleVerifier({ clientId: config.googleClientId }),
});

const server = http.createServer(app);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(config.port, config.host, () => {
  console.log(`Manna API đang chạy ở http://${config.host}:${config.port} (${production ? "production" : "dev"}${config.serveStatic ? ", phục vụ cả trang tĩnh" : ""})`);
});

const stop = () => server.close(() => { db.close(); process.exit(0); });
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
