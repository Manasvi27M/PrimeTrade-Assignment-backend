import express from "express"
import Joi from "joi"
import Entity from "../models/Entity.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

/**
 * @swagger
 * /api/entities:
 *   get:
 *     summary: Get all entities for user
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [newest, views, engagement]
 *     responses:
 *       200:
 *         description: List of entities
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const query = { userId: req.user.sub }

    if (req.query.category) {
      query.category = req.query.category
    }

    if (req.query.status) {
      query.status = req.query.status
    }

    let sortOrder = { createdAt: -1 }
    if (req.query.sortBy === "views") {
      sortOrder = { "metrics.views": -1 }
    } else if (req.query.sortBy === "engagement") {
      sortOrder = { "metrics.engagement": -1 }
    }

    const entities = await Entity.find(query).sort(sortOrder).skip(skip).limit(limit)

    const total = await Entity.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        entities,
        pagination: {
          page,
          limit,
          total,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/entities:
 *   post:
 *     summary: Create new entity
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Entity created
 *       400:
 *         description: Validation error
 */
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string(),
      category: Joi.string().required(),
      priority: Joi.string().valid("low", "medium", "high"),
      tags: Joi.array().items(Joi.string()),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    const entity = new Entity({
      ...value,
      userId: req.user.sub,
    })

    await entity.save()

    res.status(201).json({
      success: true,
      data: entity,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/entities/{id}:
 *   get:
 *     summary: Get specific entity
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entity details
 *       404:
 *         description: Entity not found
 */
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const entity = await Entity.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    })

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: "Entity not found",
        statusCode: 404,
      })
    }

    res.status(200).json({
      success: true,
      data: entity,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/entities/{id}:
 *   put:
 *     summary: Update entity
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Entity updated
 *       404:
 *         description: Entity not found
 */
router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string(),
      description: Joi.string(),
      status: Joi.string().valid("active", "inactive"),
      priority: Joi.string().valid("low", "medium", "high"),
      tags: Joi.array().items(Joi.string()),
    })

    const { error, value } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        statusCode: 400,
      })
    }

    const entity = await Entity.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      { ...value, updatedAt: new Date() },
      { new: true },
    )

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: "Entity not found",
        statusCode: 404,
      })
    }

    res.status(200).json({
      success: true,
      data: entity,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/entities/{id}:
 *   delete:
 *     summary: Delete entity
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entity deleted
 *       404:
 *         description: Entity not found
 */
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const entity = await Entity.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.sub,
    })

    if (!entity) {
      return res.status(404).json({
        success: false,
        error: "Entity not found",
        statusCode: 404,
      })
    }

    res.status(200).json({
      success: true,
      message: "Entity deleted successfully",
    })
  } catch (error) {
    next(error)
  }
})

export default router
