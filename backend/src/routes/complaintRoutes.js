import { Router } from "express";
import {
  addProgressUpdate,
  assignComplaint,
  createComplaint,
  getAllComplaints,
  getComplaintHistory,
  getComplaintMapLocations,
  getComplaintStatusById,
  updateComplaintPriority,
  updateComplaintStatus,
  getSimilarComplaints,
  setDeadline,
  getOverdueComplaints,
  submitFeedback
} from "../controllers/complaintController.js";

const router = Router();

router.get("/map/locations", getComplaintMapLocations);
router.post("/", createComplaint);
router.get("/", getAllComplaints);
router.get("/history", getComplaintHistory);
router.get("/search", getSimilarComplaints);
router.get("/overdue", getOverdueComplaints);
router.patch("/:complaintId/assign", assignComplaint);
router.post("/:complaintId/progress", addProgressUpdate);
router.get("/:complaintId/status", getComplaintStatusById);
router.patch("/:complaintId/status", updateComplaintStatus);
router.patch("/:complaintId/priority", updateComplaintPriority);
router.patch("/:complaintId/deadline", setDeadline);
router.post("/:complaintId/feedback", submitFeedback);

export default router;
