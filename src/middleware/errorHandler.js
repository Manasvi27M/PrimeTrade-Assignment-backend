export const errorHandler = (err, req, res, next) => {
  console.error(err)

  const statusCode = err.statusCode || 500
  const message = err.message || "Internal Server Error"

  // Ensure CORS headers are set even in error responses
  const origin = req.headers.origin
  const allowedOrigins = [
    "https://primetrade-assignment-frontend-theta.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ]
  
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production")) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Credentials", "true")
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
  })
}
