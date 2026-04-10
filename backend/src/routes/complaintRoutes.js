import { Router } from "express";
import {
  addComment,
  addProgressUpdate,
  assignComplaint,
  createComplaint,
  filterComplaints,
  getAllComplaints,
  getCategoryReports,
  getComments,
  getComplaintHistory,
  getComplaintMapLocations,
  getComplaintStatusById,
  getWorkerDashboard,
  updateComplaintPriority,
  updateComplaintStatus,
  getSimilarComplaints,
  setDeadline,
  getOverdueComplaints,
  submitFeedback
} from "../controllers/complaintController.js";

const router = Router();

router.get("/map/locations", getComplaintMapLocations);
router.get("/filter", filterComplaints);
router.get("/category-reports", getCategoryReports);
router.get("/worker-dashboard", getWorkerDashboard);
router.post("/", createComplaint);
router.get("/", getAllComplaints);
router.get("/history", getComplaintHistory);
router.get("/search", getSimilarComplaints);
router.get("/overdue", getOverdueComplaints);
router.patch("/:complaintId/assign", assignComplaint);
router.post("/:complaintId/progress", addProgressUpdate);
router.post("/:complaintId/comments", addComment);
router.get("/:complaintId/comments", getComments);
router.get("/:complaintId/status", getComplaintStatusById);
router.patch("/:complaintId/status", updateComplaintStatus);
router.patch("/:complaintId/priority", updateComplaintPriority);
router.patch("/:complaintId/deadline", setDeadline);
router.post("/:complaintId/feedback", submitFeedback);

export default router;
