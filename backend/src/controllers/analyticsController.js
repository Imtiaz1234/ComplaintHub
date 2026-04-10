import mongoose from "mongoose";
import { Complaint } from "../models/Complaint.js";
import { User } from "../models/User.js";

const requireAdminUser = async (adminId) => {
  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    return null;
  }

  const user = await User.findById(adminId);

  if (!user || !["Admin", "Super Admin"].includes(user.role)) {
    return null;
  }

  return user;
};

export const getAnalytics = async (req, res) => {
  try {
    const { adminId } = req.query;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can view analytics." });
    }

    // 1. Complaint volume by status
    const statusCounts = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 2. Complaint volume by priority
    const priorityCounts = await Complaint.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    // 3. Complaints per month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyVolume = await Complaint.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 4. Average resolution time (for resolved complaints)
    const resolutionStats = await Complaint.aggregate([
      { $match: { status: "Resolved", resolvedAt: { $ne: null } } },
      {
        $project: {
          resolutionTimeMs: { $subtract: ["$resolvedAt", "$createdAt"] }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionMs: { $avg: "$resolutionTimeMs" },
          minResolutionMs: { $min: "$resolutionTimeMs" },
          maxResolutionMs: { $max: "$resolutionTimeMs" },
          totalResolved: { $sum: 1 }
        }
      }
    ]);

    const avgResolution = resolutionStats[0] || {
      avgResolutionMs: 0,
      minResolutionMs: 0,
      maxResolutionMs: 0,
      totalResolved: 0
    };

    const msToHours = (ms) => Math.round((ms / (1000 * 60 * 60)) * 10) / 10;

    // 5. Worker performance
    const workerPerformance = await Complaint.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$workerTaskCompleted", true] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "workerInfo"
        }
      },
      { $unwind: "$workerInfo" },
      {
        $project: {
          workerId: "$_id",
          fullName: "$workerInfo.fullName",
          role: "$workerInfo.role",
          totalAssigned: 1,
          resolved: 1,
          completed: 1
        }
      },
      { $sort: { resolved: -1 } }
    ]);

    // 6. Average feedback rating
    const feedbackStats = await Complaint.aggregate([
      { $match: { "feedback.rating": { $ne: null } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$feedback.rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // 7. Overdue complaints count
    const now = new Date();
    const overdueCount = await Complaint.countDocuments({
      deadline: { $lt: now },
      status: { $nin: ["Resolved", "Rejected"] }
    });

    // 8. Total counts
    const totalComplaints = await Complaint.countDocuments();
    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      totalComplaints,
      totalUsers,
      overdueCount,
      statusCounts: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      priorityCounts: priorityCounts.map((p) => ({ priority: p._id, count: p.count })),
      monthlyVolume: monthlyVolume.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        count: m.count
      })),
      resolution: {
        totalResolved: avgResolution.totalResolved,
        avgHours: msToHours(avgResolution.avgResolutionMs),
        minHours: msToHours(avgResolution.minResolutionMs),
        maxHours: msToHours(avgResolution.maxResolutionMs)
      },
      workerPerformance,
      feedbackStats: feedbackStats[0] || { avgRating: 0, totalRatings: 0 }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch analytics.", error: error.message });
  }
};
