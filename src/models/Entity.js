import mongoose from "mongoose"

const entitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    category: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: [String],
    metrics: {
      views: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
    insights: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Index for better query performance
entitySchema.index({ userId: 1, createdAt: -1 })
entitySchema.index({ userId: 1, category: 1 })

export default mongoose.model("Entity", entitySchema)
