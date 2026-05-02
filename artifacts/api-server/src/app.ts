import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";
import { attachPlaceholderSession } from "./lib/testingAuth";

const app: Express = express();

// Replit's preview proxy terminates TLS in front of us. Trusting the first
// proxy hop is required for `secure` cookies (production) and accurate
// req.ip / X-Forwarded-* handling.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
// Opt-in testing bypass: when ENABLE_TESTING_AUTH=true we attach a fixed
// placeholder user id to every session so the app is usable without a
// login screen. Disabled by default; never enable this in production.
app.use(attachPlaceholderSession);

app.use("/api", router);

export default app;
