import "dotenv/config";
import { createApp } from "./server/_core/app";
import { serveVercelFrontend } from "./server/_core/vercelStatic";

const app = createApp();
serveVercelFrontend(app);

export default app;
