import express from "express";
import {
  configureMiddlewares,
  configureRoutes,
  configureErrorHandlers,
} from "./helpers/appLoaders";
import { test } from "./app/modules/playermanagement/player.service";

const app = express();
configureMiddlewares(app);
configureRoutes(app);
configureErrorHandlers(app);

test();

export default app;
