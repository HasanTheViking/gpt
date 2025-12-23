import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import listRoutes from "./routes/lists";
import itemRoutes from "./routes/items";

const app = express();

// CORS: allow local dev + your Vercel frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://gpt-beta-taupe.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin (health checks, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/lists", listRoutes);
app.use("/", itemRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ message: "Unexpected server error" });
  }
);

app.listen(env.port, () => {
  console.log(`Smart Shopping List API running on http://localhost:${env.port}`);
});
