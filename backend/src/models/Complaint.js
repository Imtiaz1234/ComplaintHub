import mongoose from "mongoose";

const STATUS_VALUES = [
  "Pending",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected"
];

const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];

const progressLogSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    photoUrl: {
      type: String,
      default: ""
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    authorName: {
      type: String,
      required: true,
      trim: true
    },
    entryType: {
      type: String,
      enum: ["update", "completed"],
      default: "update"
    }
  },
  { timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    submittedBy: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "Pending"
    },
    priority: {
      type: String,
      enum: PRIORITY_VALUES,
      default: "Low"
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, trim: true, default: "" }
    },
    submissionPhoto: {
      type: String,
      default: ""
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    workerTaskCompleted: {
      type: Boolean,
      default: false
    },
    progressLogs: [progressLogSchema],

    // Deadline & SLA Tracking
    deadline: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },

    // Citizen Feedback & Rating
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      comment: {
        type: String,
        trim: true,
        default: ""
      },
      submittedAt: {
        type: Date,
        default: null
      }
    }
  },
  { timestamps: true }
);

complaintSchema.index({ title: "text", description: "text" });

export const Complaint = mongoose.model("Complaint", complaintSchema);
export { STATUS_VALUES, PRIORITY_VALUES };
