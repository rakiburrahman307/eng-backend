import express from "express";
import {
  configureMiddlewares,
  configureRoutes,
  configureErrorHandlers,
} from "./helpers/appLoaders";

const app = express();
configureMiddlewares(app);
configureRoutes(app);
configureErrorHandlers(app);
export default app;
