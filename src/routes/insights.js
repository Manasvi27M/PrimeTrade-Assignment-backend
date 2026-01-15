import express from "express"
import Joi from "joi"
import axios from "axios"
import Insight from "../models/Insight.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

/**
 * @swagger
 * /api/insights/generate:
 *   post:
 *     summary: Generate AI insight
 *     tags: [Insights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *               entityId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Insight generated successfully
 *       400:
 *         description: Validation error
 */
router.post("/generate", authenticateToken, async (req, res, next) => {
  try {
    const schema = Joi.object({
      prompt: Joi.string().required(),
      entityId: Joi.string(),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    // Call OpenRouter API for AI insights
    const aiResponse = await axios.post(
      "https://openrouter.io/api/v1/chat/completions",
      {
        model: "openai/gpt-4-mini",
        messages: [
          {
            role: "user",
            content: value.prompt,
          },
        ],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": "Auralink",
        },
      },
    )

    const insight = new Insight({
      userId: req.user.sub,
      entityId: value.entityId,
      title: "AI Generated Insight",
      content: aiResponse.data.choices[0].message.content,
      type: "generated",
      confidence: 0.85,
    })

    await insight.save()

    res.status(200).json({
      success: true,
      data: {
        insight: insight.content,
        confidence: insight.confidence,
        model: "openai/gpt-4-mini",
      },
    })
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        error: "OpenRouter API key invalid",
        statusCode: 500,
      })
    }
    next(error)
  }
})

/**
 * @swagger
 * /api/insights:
 *   get:
 *     summary: Get user's insights
 *     tags: [Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [trend, recommendation, generated]
 *     responses:
 *       200:
 *         description: List of insights
 */
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 20
    const query = { userId: req.user.sub }

    if (req.query.type) {
      query.type = req.query.type
    }

    const insights = await Insight.find(query).sort({ createdAt: -1 }).limit(limit)

    res.status(200).json({
      success: true,
      data: insights,
    })
  } catch (error) {
    next(error)
  }
})

export default router
