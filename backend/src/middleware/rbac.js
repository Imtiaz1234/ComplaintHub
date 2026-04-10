import { User } from "../models/User.js";

/**
 * RBAC permission map.
 * Each key is a permission name; the value is an array of roles that have it.
 */
const PERMISSIONS = {
  // Complaint management
  "complaint:create":        ["Citizen", "Worker", "MP"],
  "complaint:view":          ["Citizen", "Worker", "MP", "Admin", "Super Admin"],
  "complaint:update-status": ["Admin", "Super Admin"],
  "complaint:update-priority": ["Admin", "Super Admin"],
  "complaint:assign":        ["Admin", "Super Admin"],
  "complaint:progress":      ["Worker", "MP"],
  "complaint:set-deadline":  ["Admin", "Super Admin"],
  "complaint:feedback":      ["Citizen"],

  // User management
  "user:list":               ["Admin", "Super Admin"],
  "user:update-role":        ["Admin", "Super Admin"],

  // Analytics & Reporting
  "analytics:view":          ["Admin", "Super Admin"],
  "report:export":           ["Admin", "Super Admin"],

  // Super Admin only
  "user:delete":             ["Super Admin"],
  "system:config":           ["Super Admin"],
};

/**
 * Middleware that checks whether the requesting user has the required permission.
 * Looks up the user by `req.body.requesterId`, `req.body.adminId`,
 * `req.body.citizenId`, `req.body.workerId`, or `req.query.requesterId`/`req.query.userId`.
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    const userId =
      req.body.requesterId ||
      req.body.adminId ||
      req.body.citizenId ||
      req.body.workerId ||
      req.query.requesterId ||
      req.query.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const user = await User.findById(userId).catch(() => null);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: `Access denied. Required permission: ${permission}. Your role: ${user.role}.`,
      });
    }

    req.authenticatedUser = user;
    next();
  };
};

/**
 * Middleware that allows access to any of the listed roles.
 */
export const requireRole = (...roles) => {
  return async (req, res, next) => {
    const userId =
      req.body.requesterId ||
      req.body.adminId ||
      req.body.citizenId ||
      req.body.workerId ||
      req.query.requesterId ||
      req.query.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const user = await User.findById(userId).catch(() => null);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}. Your role: ${user.role}.`,
      });
    }

    req.authenticatedUser = user;
    next();
  };
};

export { PERMISSIONS };
