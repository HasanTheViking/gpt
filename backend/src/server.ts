import express from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import listRoutes from "./routes/lists";
import itemRoutes from "./routes/items";

const app = express();

/**
 * CORS pre:
 * - Vercel web (https://*.vercel.app alebo tvoj konkrétny domain)
 * - Capacitor Android WebView (https://localhost alebo capacitor://localhost)
 * - lokálny dev (http://localhost:5173)
 *
 * Poznámka: CORS musí správne odpovedať aj na preflight OPTIONS.
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  // sem si pridaj svoj Vercel domain (odporúčam priamo ten konkrétny)
  "https://gpt-beta-taupe.vercel.app"
];

app.use(
  cors({
    origin(origin, callback) {
      // Povoliť aj requesty bez Origin (napr. curl, server-to-server)
      if (!origin) return callback(null, true);

      // Povoliť presné zhody alebo všetky vercel preview domény
      const isVercelPreview = origin.endsWith(".vercel.app");
      const isAllowed = allowedOrigins.includes(origin) || isVercelPreview;

      if (isAllowed) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
  })
);

// Preflight odpovede (niekedy to pomôže na niektorých hostoch/proxy)
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
