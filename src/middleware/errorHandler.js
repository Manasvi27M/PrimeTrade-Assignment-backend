export const errorHandler = (err, req, res, next) => {
  console.error(err)

  const statusCode = err.statusCode || 500
  const message = err.message || "Internal Server Error"

  // CRITICAL: Ensure CORS headers are ALWAYS set in error responses
  const origin = req.headers.origin
  const allowedOrigins = [
    "https://vertex-frontend-app.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ]
  
  // Normalize and check origin
  const normalizeOrigin = (orig) => orig ? orig.toLowerCase().replace(/\/$/, "") : null
  const normalizedOrigin = normalizeOrigin(origin)
  const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin)
  
  const isAllowed = !origin || 
                    normalizedAllowedOrigins.includes(normalizedOrigin) || 
                    process.env.NODE_ENV !== "production"
  
  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  } else if (origin) {
    // Allow anyway for debugging
    res.setHeader("Access-Control-Allow-Origin", origin)
  }
  
  // Always set all CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Expose-Headers", "Authorization")

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
  })
}
