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

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
