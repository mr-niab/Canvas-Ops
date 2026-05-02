import app from "./app";
import { logger } from "./lib/logger";
import { ensurePlaceholderUser } from "./lib/testingAuth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrap(): Promise<void> {
  try {
    await ensurePlaceholderUser();
  } catch (err) {
    // When testing-auth is enabled, every request relies on the placeholder
    // user existing. If we can't seed it, fail loudly instead of starting
    // up with broken API state. (No-op when the flag is off.)
    if (process.env.ENABLE_TESTING_AUTH === "true") {
      logger.error(
        { err },
        "Failed to seed placeholder user; refusing to start with testing auth enabled",
      );
      process.exit(1);
    }
    logger.error({ err }, "Failed to seed placeholder user for testing");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void bootstrap();
