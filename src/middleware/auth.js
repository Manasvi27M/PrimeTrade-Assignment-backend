import jwt from "jsonwebtoken"

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
      statusCode: 401,
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
      statusCode: 403,
    })
  }
}

export const generateTokens = (userId, email) => {
  const expiresIn = process.env.JWT_EXPIRY || "7d"

  const accessToken = jwt.sign({ sub: userId, email }, process.env.JWT_SECRET, { expiresIn })

  return {
    accessToken,
    expiresIn: Number.parseInt(process.env.JWT_EXPIRY || "604800"),
  }
}
