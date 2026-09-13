import express from "express";
import {
  configureMiddlewares,
  configureRoutes,
  configureErrorHandlers,
} from "./helpers/appLoaders";

const app = express();
app.set("trust proxy", 1);
configureMiddlewares(app);
configureRoutes(app);
configureErrorHandlers(app);
export default app;
