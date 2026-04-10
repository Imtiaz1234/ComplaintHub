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

const escapeCSV = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

export const exportCSV = async (req, res) => {
  try {
    const { adminId } = req.query;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can export reports." });
    }

    const complaints = await Complaint.find()
      .populate("citizenId", "fullName email")
      .populate("assignedTo", "fullName email role")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Complaint ID",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Submitted By",
      "Citizen Email",
      "Assigned To",
      "Assignee Role",
      "Archived",
      "Deadline",
      "Resolved At",
      "Rating",
      "Feedback Comment",
      "Location Address",
      "Latitude",
      "Longitude",
      "Created At",
      "Updated At"
    ];

    const rows = complaints.map((c) => [
      escapeCSV(c.complaintId),
      escapeCSV(c.title),
      escapeCSV(c.description),
      escapeCSV(c.status),
      escapeCSV(c.priority),
      escapeCSV(c.citizenId?.fullName || c.submittedBy),
      escapeCSV(c.citizenId?.email),
      escapeCSV(c.assignedTo?.fullName),
      escapeCSV(c.assignedTo?.role),
      escapeCSV(c.isArchived ? "Yes" : "No"),
      escapeCSV(c.deadline ? new Date(c.deadline).toISOString() : ""),
      escapeCSV(c.resolvedAt ? new Date(c.resolvedAt).toISOString() : ""),
      escapeCSV(c.feedback?.rating),
      escapeCSV(c.feedback?.comment),
      escapeCSV(c.location?.address),
      escapeCSV(c.location?.lat),
      escapeCSV(c.location?.lng),
      escapeCSV(new Date(c.createdAt).toISOString()),
      escapeCSV(new Date(c.updatedAt).toISOString())
    ]);

    const csvContent =
      headers.map(escapeCSV).join(",") +
      "\n" +
      rows.map((row) => row.join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=complaints-report-${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: "Failed to export CSV.", error: error.message });
  }
};

export const exportPDF = async (req, res) => {
  try {
    const { adminId } = req.query;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can export reports." });
    }

    const complaints = await Complaint.find()
      .populate("citizenId", "fullName email")
      .populate("assignedTo", "fullName email role")
      .sort({ createdAt: -1 })
      .lean();

    // Build a simple text-based PDF-style report as HTML for download
    const now = new Date().toISOString();

    let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>ComplaintHub Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
  h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px; }
  .meta { color: #666; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th { background: #1a73e8; color: white; padding: 8px 6px; text-align: left; }
  td { padding: 6px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) { background: #f8f9fa; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; }
  .summary-card { background: #f0f4ff; padding: 16px; border-radius: 8px; min-width: 120px; text-align: center; }
  .summary-card strong { font-size: 24px; display: block; color: #1a73e8; }
  .overdue { color: #d32f2f; font-weight: bold; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>ComplaintHub — Complaint Report</h1>
<div class="meta">Generated: ${now}</div>
<div class="summary">
  <div class="summary-card"><strong>${complaints.length}</strong>Total Complaints</div>
  <div class="summary-card"><strong>${complaints.filter((c) => c.status === "Resolved").length}</strong>Resolved</div>
  <div class="summary-card"><strong>${complaints.filter((c) => c.status === "Pending").length}</strong>Pending</div>
  <div class="summary-card"><strong>${complaints.filter((c) => c.deadline && new Date(c.deadline) < new Date() && !["Resolved", "Rejected"].includes(c.status)).length}</strong>Overdue</div>
</div>
<table>
<thead>
<tr>
  <th>#</th>
  <th>Complaint ID</th>
  <th>Title</th>
  <th>Status</th>
  <th>Priority</th>
  <th>Submitted By</th>
  <th>Assigned To</th>
  <th>Deadline</th>
  <th>Rating</th>
  <th>Created</th>
</tr>
</thead>
<tbody>`;

    complaints.forEach((c, i) => {
      const isOverdue =
        c.deadline &&
        new Date(c.deadline) < new Date() &&
        !["Resolved", "Rejected"].includes(c.status);

      html += `
<tr>
  <td>${i + 1}</td>
  <td>${c.complaintId}</td>
  <td>${c.title}</td>
  <td>${c.status}</td>
  <td>${c.priority}</td>
  <td>${c.citizenId?.fullName || c.submittedBy || ""}</td>
  <td>${c.assignedTo?.fullName || "Unassigned"}</td>
  <td class="${isOverdue ? "overdue" : ""}">${c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}${isOverdue ? " (OVERDUE)" : ""}</td>
  <td>${c.feedback?.rating ? `${c.feedback.rating}/5` : "—"}</td>
  <td>${new Date(c.createdAt).toLocaleDateString()}</td>
</tr>`;
    });

    html += `
</tbody>
</table>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=complaints-report-${Date.now()}.html`);
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).json({ message: "Failed to export PDF report.", error: error.message });
  }
};
