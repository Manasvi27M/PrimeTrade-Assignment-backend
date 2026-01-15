import express from "express"
import Entity from "../models/Entity.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get("/dashboard", authenticateToken, async (req, res, next) => {
  try {
    const entities = await Entity.find({ userId: req.user.sub })

    const totalEntities = entities.length
    const activeEntities = entities.filter((e) => e.status === "active").length
    const totalViews = entities.reduce((sum, e) => sum + (e.metrics.views || 0), 0)
    const avgEngagement =
      entities.length > 0 ? entities.reduce((sum, e) => sum + (e.metrics.engagement || 0), 0) / entities.length : 0

    // Calculate trend (simplified - compare this month to last month)
    const now = new Date()
    const thisMonthEntities = entities.filter((e) => {
      const created = new Date(e.createdAt)
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const lastMonthEntities = entities.filter((e) => {
      const created = new Date(e.createdAt)
      return created.getMonth() === lastMonth.getMonth() && created.getFullYear() === lastMonth.getFullYear()
    }).length

    const trend =
      lastMonthEntities > 0 ? Math.round(((thisMonthEntities - lastMonthEntities) / lastMonthEntities) * 100) : 0

    res.status(200).json({
      success: true,
      data: {
        totalEntities,
        activeEntities,
        avgEngagement: Math.round(avgEngagement * 10) / 10,
        totalViews,
        trend,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/analytics/performance:
 *   get:
 *     summary: Get performance trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: Performance trends
 */
router.get("/performance", authenticateToken, async (req, res, next) => {
  try {
    const startDate = new Date(req.query.startDate)
    const endDate = new Date(req.query.endDate)
    const period = req.query.period || "daily"

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
        statusCode: 400,
      })
    }

    const entities = await Entity.find({
      userId: req.user.sub,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })

    const performanceMap = {}

    entities.forEach((entity) => {
      let dateKey
      const entityDate = new Date(entity.createdAt)

      if (period === "daily") {
        dateKey = entityDate.toISOString().split("T")[0]
      } else if (period === "weekly") {
        const weekStart = new Date(entityDate)
        weekStart.setDate(entityDate.getDate() - entityDate.getDay())
        dateKey = weekStart.toISOString().split("T")[0]
      } else if (period === "monthly") {
        dateKey = entityDate.toISOString().split("T")[0].substring(0, 7)
      }

      if (!performanceMap[dateKey]) {
        performanceMap[dateKey] = {
          date: dateKey,
          entities: 0,
          views: 0,
          engagement: 0,
        }
      }

      performanceMap[dateKey].entities += 1
      performanceMap[dateKey].views += entity.metrics.views || 0
      performanceMap[dateKey].engagement += entity.metrics.engagement || 0
    })

    const data = Object.values(performanceMap).sort((a, b) => new Date(a.date) - new Date(b.date))

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
})

export default router
