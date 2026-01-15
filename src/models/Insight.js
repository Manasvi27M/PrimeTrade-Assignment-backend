import mongoose from "mongoose"

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entity",
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["trend", "recommendation", "generated"],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
)

// Index for better query performance
insightSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model("Insight", insightSchema)
