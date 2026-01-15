import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import entityRoutes from "./routes/entities.js";
import analyticsRoutes from "./routes/analytics.js";
import insightsRoutes from "./routes/insights.js";

dotenv.config();

const app = express();

connectDB();

// CORS configuration - MUST be first middleware
const allowedOrigins = [
  "https://primetrade-assignment-frontend-theta.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
];

// Normalize origin for comparison (remove trailing slash, lowercase)
const normalizeOrigin = (origin) => {
  if (!origin) return null;
  return origin.toLowerCase().replace(/\/$/, "");
};

// CORS middleware function - handles all CORS headers
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);
  
  // Check if origin is allowed (case-insensitive, handles trailing slashes)
  // Always allow if no origin (server-to-server) or if in allowed list
  const isAllowed = !origin || 
                    normalizedAllowedOrigins.includes(normalizedOrigin) || 
                    process.env.NODE_ENV !== "production";
  
  // CRITICAL: Always set Access-Control-Allow-Origin if origin is present and allowed
  // This is required for CORS to work
  if (origin) {
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      // Even if not explicitly allowed, allow it for debugging
      // Remove this in production after confirming it works
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  
  // CRITICAL: Always set these headers for ALL requests (including preflight)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers", "Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  
  // CRITICAL: Handle preflight OPTIONS requests - MUST return early with 200
  // This is what the browser sends before the actual request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
};

// Apply CORS middleware FIRST - before everything else
// This MUST be the very first middleware
app.use(corsMiddleware);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS", // Skip rate limiting for OPTIONS requests
});

app.use(limiter);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auralink Backend API",
      version: "1.0.0",
      description: "Complete API documentation for Auralink SaaS application",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.auralink.com"
            : "http://localhost:5000",
        description:
          process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Authorization token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            avatar: { type: "string", format: "uri" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Entity: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            status: { type: "string", enum: ["active", "inactive"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            tags: { type: "array", items: { type: "string" } },
            metrics: {
              type: "object",
              properties: {
                views: { type: "number" },
                engagement: { type: "number" },
                score: { type: "number" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Insight: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            title: { type: "string" },
            content: { type: "string" },
            type: {
              type: "string",
              enum: ["trend", "recommendation", "generated"],
            },
            confidence: { type: "number", format: "decimal" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" },
            statusCode: { type: "integer" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/insights", insightsRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    statusCode: 404,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only listen if not in Vercel serverless environment
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}

// Export for Vercel serverless functions
export default app;
