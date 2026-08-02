import express from "express";
import { configureMiddlewares, configureRoutes, configureErrorHandlers } from "./helpers/appLoaders";

const app = express();

// 1. Configure pre-routing and global middleware (Webhook, CORS, Parsers, Sessions)
configureMiddlewares(app);

// 2. Register application routes
configureRoutes(app);

// 3. Register error and not-found middleware handlers
configureErrorHandlers(app);

export default app;