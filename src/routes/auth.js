import express from "express"
import Joi from "joi"
import User from "../models/User.js"
import { authenticateToken, generateTokens } from "../middleware/auth.js"
import { OAuth2Client } from "google-auth-library"

const router = express.Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post("/signup", async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      name: Joi.string().required(),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: value.email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
        statusCode: 400,
      })
    }

    // Create new user
    const user = new User({
      email: value.email,
      passwordHash: value.password,
      name: value.name,
    })

    await user.save()

    const tokens = generateTokens(user._id.toString(), user.email)

    res.status(201).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    const user = await User.findOne({ email: value.email })
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
        statusCode: 401,
      })
    }

    const isValidPassword = await user.comparePassword(value.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
        statusCode: 401,
      })
    }

    const tokens = generateTokens(user._id.toString(), user.email)

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google login successful
 *       400:
 *         description: Invalid token
 */
router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "ID token is required",
        statusCode: 400,
      })
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const { email, name, picture } = ticket.getPayload()

    // Find or create user
    let user = await User.findOne({ googleId: ticket.getPayload().sub })

    if (!user) {
      user = await User.findOne({ email })

      if (user) {
        user.googleId = ticket.getPayload().sub
      } else {
        user = new User({
          email,
          name: name || email.split("@")[0],
          avatar: picture,
          googleId: ticket.getPayload().sub,
        })
      }

      await user.save()
    }

    const tokens = generateTokens(user._id.toString(), user.email)

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Google authentication failed",
      statusCode: 400,
    })
  }
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        statusCode: 404,
      })
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.put("/profile", authenticateToken, async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string(),
      avatar: Joi.string().uri(),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    const user = await User.findByIdAndUpdate(req.user.sub, { ...value, updatedAt: new Date() }, { new: true })

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
})

export default router
