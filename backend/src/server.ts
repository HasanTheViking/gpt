import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import listRoutes from "./routes/lists.js";
import itemRoutes from "./routes/items.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/lists", listRoutes);
app.use("/", itemRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

app.listen(env.port, () => {
  console.log(`Smart Shopping List API running on http://localhost:${env.port}`);
});
