import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();
    const server = app.listen(env.PORT, () => {
      logger.info(
        `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`,
      );
    });
    
    const handleGracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info("Http server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exitCode = 1;
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
