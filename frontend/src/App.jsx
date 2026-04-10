import { useEffect, useState } from "react";
import {
  addComment,
  addProgressUpdate,
  assignComplaint,
  createComplaint,
  filterComplaints,
  getCategoryReports,
  getComments,
  getComplaintHistory,
  getComplaintStatus,
  getNotifications,
  getUsers,
  getWorkerDashboard,
  login as loginUser,
  markAllNotificationsRead,
  markNotificationRead,
  requestLoginOtp,
  searchComplaints,
  signUp,
  updateComplaintPriority,
  updateComplaintStatus,
  updateUserRole,
  verifyLoginOtp,
  setDeadline,
  getOverdueComplaints,
  submitFeedback,
  getAnalytics,
  exportCSV,
  exportPDF
} from "./api/complaintApi";
import ComplaintsMap from "./components/ComplaintsMap.jsx";

const STATUS_VALUES = ["Pending", "Assigned", "In Progress", "Resolved", "Rejected"];
const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];
const CATEGORY_VALUES = [
  "Roads & Infrastructure", "Water & Sewage", "Electricity", "Garbage & Waste",
  "Public Safety", "Noise & Pollution", "Parks & Recreation", "Transportation",
  "Building & Housing", "Other"
];
const ROLE_ASSIGN_OPTIONS = ["Citizen", "Worker", "MP", "Admin"];
const STORAGE_KEY = "complainthub-user";

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function App() {
  const [authMode, setAuthMode] = useState("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Other");
  const [locationAddress, setLocationAddress] = useState("");
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [submissionPhotoFile, setSubmissionPhotoFile] = useState(null);
  const [newComplaint, setNewComplaint] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackError, setTrackError] = useState("");

  const [adminId, setAdminId] = useState("");
  const [adminStatus, setAdminStatus] = useState("Assigned");
  const [adminPriority, setAdminPriority] = useState("Medium");
  const [adminMessage, setAdminMessage] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [users, setUsers] = useState([]);
  const [userAdminMessage, setUserAdminMessage] = useState("");
  const [roleSelections, setRoleSelections] = useState({});
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [workComplaintId, setWorkComplaintId] = useState("");
  const [workUpdateText, setWorkUpdateText] = useState("");
  const [workPhotoFile, setWorkPhotoFile] = useState(null);
  const [workMessage, setWorkMessage] = useState("");

  // Deadline & SLA state
  const [deadlineComplaintId, setDeadlineComplaintId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineMessage, setDeadlineMessage] = useState("");
  const [overdueComplaints, setOverdueComplaints] = useState([]);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");

  // Export state
  const [exportMessage, setExportMessage] = useState("");

  // Search & Filter state
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterResults, setFilterResults] = useState([]);
  const [filterMessage, setFilterMessage] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Worker Dashboard state
  const [workerDashData, setWorkerDashData] = useState(null);

  // Comment / Discussion state
  const [commentComplaintId, setCommentComplaintId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentList, setCommentList] = useState([]);
  const [commentMessage, setCommentMessage] = useState("");

  // Category Reports state
  const [categoryReports, setCategoryReports] = useState([]);

  useEffect(() => {
    const rawUser = window.localStorage.getItem(STORAGE_KEY);

    if (!rawUser) {
      return;
    }

    try {
      setCurrentUser(JSON.parse(rawUser));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadComplaints = async (user = currentUser, nextFilter = historyFilter) => {
    if (!user) {
      setComplaints([]);
      return;
    }

    try {
      const list = await getComplaintHistory({
        userId: user.id,
        role: user.role,
        archived: nextFilter === "all" ? undefined : nextFilter === "archived"
      });
      setComplaints(list);
    } catch {
      setComplaints([]);
    }
  };

  const loadUsers = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin"].includes(user.role)) {
      setUsers([]);
      return;
    }

    try {
      const nextUsers = await getUsers(user.id);
      setUsers(nextUsers);
      const nextSelections = {};
      nextUsers.forEach((nextUser) => {
        nextSelections[nextUser.id] = nextUser.role;
      });
      setRoleSelections(nextSelections);
      const firstAssignable = nextUsers.find((nextUser) => ["Worker", "MP"].includes(nextUser.role));
      setAssigneeUserId((previous) => previous || firstAssignable?.id || "");
    } catch {
      setUsers([]);
      setRoleSelections({});
    }
  };

  const loadAnalytics = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin"].includes(user.role)) {
      setAnalytics(null);
      return;
    }

    try {
      const data = await getAnalytics(user.id);
      setAnalytics(data);
      setAnalyticsError("");
    } catch (error) {
      setAnalyticsError(error.message);
    }
  };

  const loadNotifications = async (user = currentUser) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const data = await getAnalytics(user.id);
      setAnalytics(data);
      setAnalyticsError("");
    } catch (error) {
      setAnalyticsError(error.message);
    }
  };

  const loadOverdue = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin"].includes(user.role)) {
      setOverdueComplaints([]);
      return;
    }

    try {
      const data = await getOverdueComplaints(user.id);
      setOverdueComplaints(data);
    } catch {
      setOverdueComplaints([]);
    }
  };

  const loadWorkerDashboard = async (user = currentUser) => {
    if (!user || !["Worker", "MP"].includes(user.role)) {
      setWorkerDashData(null);
      return;
    }

    try {
      const data = await getWorkerDashboard(user.id);
      setWorkerDashData(data);
    } catch {
      setWorkerDashData(null);
    }
  };

  const loadCategoryReports = async (user = currentUser) => {
    if (!user || !["Admin", "Super Admin"].includes(user.role)) {
      setCategoryReports([]);
      return;
    }

    try {
      const data = await getCategoryReports();
      setCategoryReports(data);
    } catch {
      setCategoryReports([]);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    loadComplaints();
  }, [currentUser, historyFilter]);

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    loadAnalytics();
    loadOverdue();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
    const interval = setInterval(() => loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadWorkerDashboard();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadCategoryReports();
  }, [currentUser]);

  useEffect(() => {
    if (title.trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchComplaints(title);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [title]);

  useEffect(() => {
    const role = currentUser?.role;
    const isAssignable = role === "Worker" || role === "MP";

    if (!isAssignable || complaints.length === 0) {
      return undefined;
    }

    setWorkComplaintId((previous) => {
      if (previous && complaints.some((item) => item.complaintId === previous)) {
        return previous;
      }

      return complaints[0].complaintId;
    });
    return undefined;
  }, [complaints, currentUser]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        await signUp({ fullName, email, phone, password });
        setAuthMessage("Account created successfully. Please log in using your credentials.");
        setAuthMode("login");
        setLoginMethod("password");
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setOtpCode("");
        setOtpPreview("");
        return;
      }

      if (loginMethod !== "password") {
        setAuthError("Use the OTP button flow for OTP login.");
        return;
      }

      const response = await loginUser({ identifier: email, password });

      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword("");
      setOtpCode("");
      setOtpPreview("");
      setAuthMessage(`Logged in as ${response.user.fullName}.`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setComplaints([]);
    setUsers([]);
    setTrackId("");
    setTrackedComplaint(null);
    setTrackError("");
    setGeoLocation(null);
    setGeoError("");
    setLocationAddress("");
    setSubmissionPhotoFile(null);
    setAssigneeUserId("");
    setAssignMessage("");
    setWorkComplaintId("");
    setWorkUpdateText("");
    setWorkPhotoFile(null);
    setWorkMessage("");
    setAuthError("");
    setAuthMessage("");
    setRoleSelections({});
    setAuthMode("login");
    setLoginMethod("password");
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setOtpCode("");
    setOtpPreview("");
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
    setWorkerDashData(null);
    setCategoryReports([]);
    setFilterResults([]);
    setFilterMessage("");
    setCommentComplaintId("");
    setCommentList([]);
    setCommentText("");
    setCommentMessage("");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleRequestOtpLogin = async () => {
    setAuthError("");
    setAuthMessage("");

    try {
      const response = await requestLoginOtp(email);
      setOtpPreview(response.otpPreview || "");
      setAuthMessage(response.message || "OTP sent. Enter it below to log in.");
    } catch (error) {
      setOtpPreview("");
      setAuthError(error.message);
    }
  };

  const handleVerifyOtpLogin = async () => {
    setAuthError("");
    setAuthMessage("");

    try {
      const response = await verifyLoginOtp({ email, otp: otpCode });
      setCurrentUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      setPassword("");
      setOtpCode("");
      setOtpPreview("");
      setAuthMessage(`Logged in as ${response.user.fullName}.`);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const totalComplaints = complaints.length;
  const archivedComplaints = complaints.filter((complaint) => complaint.isArchived).length;
  const activeComplaints = totalComplaints - archivedComplaints;
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
  const isWorkerOrMp = currentUser?.role === "Worker" || currentUser?.role === "MP";

  const handleRoleUpdate = async (userId) => {
    setUserAdminMessage("");

    const role = roleSelections[userId];

    try {
      const response = await updateUserRole({
        requesterId: currentUser.id,
        userId,
        role
      });

      setUserAdminMessage(response.message);

      if (response.user.id === currentUser.id) {
        setCurrentUser(response.user);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
      }

      await loadUsers();
    } catch (error) {
      setUserAdminMessage(error.message);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setNewComplaint(null);

    try {
      let submissionPhoto = "";

      if (submissionPhotoFile) {
        submissionPhoto = await fileToDataUrl(submissionPhotoFile);
      }

      const payload = {
        title,
        description,
        citizenId: currentUser.id,
        category: complaintCategory,
        submissionPhoto
      };

      const trimmedAddress = locationAddress.trim();

      if (geoLocation) {
        payload.location = {
          lat: geoLocation.lat,
          lng: geoLocation.lng,
          address: trimmedAddress
        };
      } else if (trimmedAddress.length > 0) {
        payload.location = {
          address: trimmedAddress
        };
      }

      const created = await createComplaint(payload);
      setNewComplaint(created);
      setTitle("");
      setDescription("");
      setComplaintCategory("Other");
      setLocationAddress("");
      setGeoLocation(null);
      setGeoError("");
      setSubmissionPhotoFile(null);
      setSuggestions([]);
      await loadComplaints();
    } catch (error) {
      setSubmitError(error.message);
    }
  };

  const handleTrack = async (event) => {
    event.preventDefault();
    setTrackError("");
    setTrackedComplaint(null);

    try {
      const result = await getComplaintStatus(trackId.trim());
      setTrackedComplaint(result);
    } catch (error) {
      setTrackError(error.message);
    }
  };

  const handleAdminUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");

    try {
      const updated = await updateComplaintStatus(adminId.trim(), adminStatus, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} to ${updated.status}`);

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }

      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handlePriorityUpdate = async (event) => {
    event.preventDefault();
    setAdminMessage("");

    try {
      const updated = await updateComplaintPriority(adminId.trim(), adminPriority, currentUser.id);
      setAdminMessage(`Updated ${updated.complaintId} priority to ${updated.priority}`);

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }

      await loadComplaints();
    } catch (error) {
      setAdminMessage(error.message);
    }
  };

  const handleUseLocation = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        setGeoError("Unable to read your location. Allow access in the browser or skip this step.");
      }
    );
  };

  const handleAssignComplaint = async (event) => {
    event.preventDefault();
    setAssignMessage("");

    try {
      const updated = await assignComplaint(adminId.trim(), {
        adminId: currentUser.id,
        assigneeUserId
      });
      setAssignMessage(`Assigned ${updated.complaintId} to ${updated.assignedTo?.fullName || "assignee"}.`);
      await loadComplaints();

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }
    } catch (error) {
      setAssignMessage(error.message);
    }
  };

  const submitWorkerUpdate = async ({ markCompleted }) => {
    setWorkMessage("");

    if (!workComplaintId.trim()) {
      setWorkMessage("Select a complaint first.");
      return;
    }

    try {
      let photoUrl = "";

      if (workPhotoFile) {
        photoUrl = await fileToDataUrl(workPhotoFile);
      }

      const updated = await addProgressUpdate(workComplaintId.trim(), {
        workerId: currentUser.id,
        text: workUpdateText,
        photoUrl,
        markCompleted
      });
      setWorkMessage(markCompleted ? "Task marked complete and log saved." : "Progress update saved.");
      setWorkUpdateText("");
      setWorkPhotoFile(null);
      await loadComplaints();
      await loadWorkerDashboard();

      if (trackId.trim() === updated.complaintId) {
        const tracked = await getComplaintStatus(updated.complaintId);
        setTrackedComplaint(tracked);
      }
    } catch (error) {
      setWorkMessage(error.message);
    }
  };

  const handleSetDeadline = async (event) => {
    event.preventDefault();
    setDeadlineMessage("");

    try {
      const updated = await setDeadline(deadlineComplaintId.trim(), {
        adminId: currentUser.id,
        deadline: deadlineDate
      });
      setDeadlineMessage(`Deadline set for ${updated.complaintId}: ${new Date(updated.deadline).toLocaleDateString()}`);
      await loadComplaints();
      await loadOverdue();
    } catch (error) {
      setDeadlineMessage(error.message);
    }
  };

  const handleSubmitFeedback = async (complaintId) => {
    setFeedbackMessage("");

    try {
      await submitFeedback(complaintId, {
        citizenId: currentUser.id,
        rating: feedbackRating,
        comment: feedbackComment
      });
      setFeedbackMessage(`Thank you! Your ${feedbackRating}-star rating for ${complaintId} has been recorded.`);
      setFeedbackComment("");
      setFeedbackRating(5);
      await loadComplaints();
    } catch (error) {
      setFeedbackMessage(error.message);
    }
  };

  const handleExportCSV = async () => {
    setExportMessage("");

    try {
      await exportCSV(currentUser.id);
      setExportMessage("CSV report downloaded.");
    } catch (error) {
      setExportMessage(error.message);
    }
  };

  const handleExportPDF = async () => {
    setExportMessage("");

    try {
      await exportPDF(currentUser.id);
      setExportMessage("PDF report downloaded.");
    } catch (error) {
      setExportMessage(error.message);
    }
  };

  const handleFilterSearch = async (event) => {
    event.preventDefault();
    setFilterMessage("");

    try {
      const results = await filterComplaints({
        status: filterStatus,
        category: filterCategory,
        priority: filterPriority,
        area: filterArea,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        keyword: filterKeyword
      });
      setFilterResults(results);
      setFilterMessage(`Found ${results.length} complaint(s).`);
    } catch (error) {
      setFilterMessage(error.message);
      setFilterResults([]);
    }
  };

  const handleClearFilters = () => {
    setFilterStatus("");
    setFilterCategory("");
    setFilterPriority("");
    setFilterArea("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterKeyword("");
    setFilterResults([]);
    setFilterMessage("");
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      await loadNotifications();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(currentUser.id);
      await loadNotifications();
    } catch {}
  };

  const handleLoadComments = async (complaintId) => {
    setCommentComplaintId(complaintId);
    setCommentMessage("");

    try {
      const comments = await getComments(complaintId);
      setCommentList(comments);
    } catch (error) {
      setCommentMessage(error.message);
      setCommentList([]);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    setCommentMessage("");

    if (!commentText.trim()) {
      setCommentMessage("Comment text is required.");
      return;
    }

    try {
      await addComment(commentComplaintId, {
        userId: currentUser.id,
        text: commentText.trim()
      });
      setCommentText("");
      setCommentMessage("Comment added.");
      const comments = await getComments(commentComplaintId);
      setCommentList(comments);
    } catch (error) {
      setCommentMessage(error.message);
    }
  };
    }
  };

  if (!currentUser) {
    return (
      <div className="container auth-container">
        <section className="auth-hero">
          <p className="eyebrow">ComplaintHub</p>
          <h1>A platform where citizens can report city problems, raise their voices, and work together to make their community better.</h1>
          <p className="hero-copy">
            Log in first, then submit complaints, track status by complaint ID, browse complaint history and archive, and use the FAQ help center.
          </p>
        </section>

        <section className="card auth-card">
          <div className="auth-tabs">
            <button type="button" className={authMode === "signup" ? "tab active" : "tab"} onClick={() => setAuthMode("signup")}>Sign Up</button>
            <button type="button" className={authMode === "login" ? "tab active" : "tab"} onClick={() => setAuthMode("login")}>Login</button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "signup" ? (
              <>
                <label>Full Name</label>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />

                <label>Email</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

                <label>Phone (optional)</label>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+8801XXXXXXXXX" />

                <label>Password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </>
            ) : (
              <>
                <label>Email</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} required />

                <div className="auth-tabs login-method-tabs">
                  <button
                    type="button"
                    className={loginMethod === "password" ? "tab active" : "tab"}
                    onClick={() => {
                      setLoginMethod("password");
                      setAuthError("");
                      setAuthMessage("");
                      setOtpPreview("");
                    }}
                  >
                    Sign in using Password
                  </button>
                  <button
                    type="button"
                    className={loginMethod === "otp" ? "tab active" : "tab"}
                    onClick={() => {
                      setLoginMethod("otp");
                      setAuthError("");
                      setAuthMessage("");
                      setOtpPreview("");
                    }}
                  >
                    Sign in using OTP (Optional)
                  </button>
                </div>

                {loginMethod === "password" ? (
                  <>
                    <label>Password</label>
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  </>
                ) : (
                  <>
                    <label>OTP Code</label>
                    <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="Enter OTP from your email" />
                    <div className="otp-actions">
                      <button type="button" onClick={handleRequestOtpLogin}>Send OTP to Email</button>
                      <button type="button" onClick={handleVerifyOtpLogin}>Verify OTP & Login</button>
                    </div>
                    {otpPreview ? <div className="otp-box">Demo OTP: <strong>{otpPreview}</strong></div> : null}
                  </>
                )}
              </>
            )}

            {authMode === "signup" || loginMethod === "password" ? (
              <button type="submit">{authMode === "signup" ? "Create Account" : "Login"}</button>
            ) : null}
          </form>

          {authError ? <div className="error">{authError}</div> : null}
          {authMessage ? <div className="success">{authMessage}</div> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="hero app-hero">
        <p className="eyebrow">ComplaintHub</p>
        <h1>
          {isAdmin ? "Admin Dashboard" : isWorkerOrMp ? "Worker / MP Dashboard" : "User Dashboard"}
        </h1>
        <p className="hero-copy">
          {isAdmin
            ? "Manage complaints, assign workers or MPs, set status and priority, and review map and history."
            : isWorkerOrMp
              ? "View assigned complaints, add progress updates with photos, mark tasks complete, and track status by ID."
              : "Submit complaints with optional photo and map location, track them by ID, browse history, and use the help center."}
        </p>
        <div className="user-banner hero-user-banner">
          <div>
            Signed in as <strong>{currentUser.fullName}</strong> ({currentUser.role})
          </div>
          <div className="header-actions">
            <div className="notification-wrapper">
              <button
                type="button"
                className="secondary-button notification-bell"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                Notifications {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
              </button>
              {showNotifications ? (
                <div className="notification-dropdown">
                  <div className="notif-header">
                    <strong>Notifications</strong>
                    {unreadCount > 0 ? (
                      <button type="button" className="secondary-button" onClick={handleMarkAllRead}>
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="small notif-empty">No notifications yet.</div>
                  ) : (
                    <ul className="notif-list">
                      {notifications.map((notif) => (
                        <li
                          key={notif._id}
                          className={notif.isRead ? "notif-item read" : "notif-item unread"}
                          onClick={() => !notif.isRead && handleMarkNotificationRead(notif._id)}
                        >
                          <div className="notif-message">{notif.message}</div>
                          <div className="small">{formatDate(notif.createdAt)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <section className="card">
        <h3>User Dashboard</h3>
        <div className="dashboard-grid">
          <div className="dashboard-stat">
            <span className="stat-label">Role</span>
            <strong>{currentUser.role}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Total Complaints</span>
            <strong>{totalComplaints}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Active</span>
            <strong>{activeComplaints}</strong>
          </div>
          <div className="dashboard-stat">
            <span className="stat-label">Archived</span>
            <strong>{archivedComplaints}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h3>Search & Filter Complaints</h3>
          <button type="button" className="secondary-button" onClick={() => setShowFilterPanel(!showFilterPanel)}>
            {showFilterPanel ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilterPanel ? (
          <form onSubmit={handleFilterSearch} className="filter-form">
            <div className="filter-grid">
              <div>
                <label>Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All</option>
                  {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Category</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">All</option>
                  {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Priority</label>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="">All</option>
                  {PRIORITY_VALUES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label>Area / Location</label>
                <input value={filterArea} onChange={(e) => setFilterArea(e.target.value)} placeholder="e.g., Dhaka" />
              </div>
              <div>
                <label>Date from</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div>
                <label>Date to</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
            </div>

            <label>Keyword</label>
            <input value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} placeholder="Search by title or description..." />

            <div className="filter-actions">
              <button type="submit">Search</button>
              <button type="button" className="secondary-button" onClick={handleClearFilters}>Clear</button>
            </div>
          </form>
        ) : null}

        {filterMessage ? <div className="small">{filterMessage}</div> : null}

        {filterResults.length > 0 ? (
          <div className="filter-results">
            {filterResults.map((complaint) => (
              <article key={complaint._id} className="history-item">
                <div className="history-topline">
                  <strong>{complaint.complaintId}</strong>
                  <span className={complaint.isArchived ? "archive-pill archived" : "archive-pill active-archive"}>
                    {complaint.isArchived ? "Archived" : "Active"}
                  </span>
                </div>
                <div>{complaint.title}</div>
                <div className="small">Category: {complaint.category || "Other"}</div>
                <div className="small">Status: {complaint.status} | Priority: {complaint.priority}</div>
                <div className="small">Created: {formatDate(complaint.createdAt)}</div>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ marginTop: "8px", width: "auto" }}
                  onClick={() => handleLoadComments(complaint.complaintId)}
                >
                  Discussion
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {currentUser.role === "Citizen" ? (
        <section className="card">
          <h3>Submit Complaint</h3>
          <p className="small">Add an optional photo and your location so the issue appears on the map.</p>
          <form onSubmit={handleCreate}>
            <label>Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />

            <label>Description</label>
            <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required />

            <label>Category</label>
            <select value={complaintCategory} onChange={(event) => setComplaintCategory(event.target.value)}>
              {CATEGORY_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label>Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSubmissionPhotoFile(file || null);
              }}
            />

            <label>Location address (optional)</label>
            <input
              value={locationAddress}
              onChange={(event) => setLocationAddress(event.target.value)}
              placeholder="e.g., 1 Kuratoli, Dhaka 1229"
            />
            <p className="small geo-hint muted">
              Type a full address or area: the server looks it up on OpenStreetMap and saves map coordinates. You can
              also use the GPS button below instead of typing, or use both (GPS + address label).
            </p>

            <div className="location-row">
              <button type="button" className="secondary-button" onClick={handleUseLocation}>
                Use my current location
              </button>
              {geoLocation ? (
                <span className="small geo-hint">
                  GPS saved: {geoLocation.lat.toFixed(5)}, {geoLocation.lng.toFixed(5)}
                </span>
              ) : (
                <span className="small geo-hint muted">GPS is optional if your typed address is found.</span>
              )}
            </div>
            {geoError ? <div className="error">{geoError}</div> : null}

            <button type="submit">Create Complaint</button>
          </form>

          {suggestions.length > 0 ? (
            <div className="suggestions">
              <h4>Similar complaints found</h4>
              <p>Check these records before creating a duplicate complaint.</p>
              <ul>
                {suggestions.map((complaint) => (
                  <li key={complaint._id} className="suggestion-item">
                    <strong>{complaint.complaintId}</strong>: {complaint.title}
                    <br />
                    <small>Status: {complaint.status} | Priority: {complaint.priority}</small>
                    <br />
                    <button
                      type="button"
                      onClick={async () => {
                        setTrackId(complaint.complaintId);
                        setTrackError("");

                        try {
                          const full = await getComplaintStatus(complaint.complaintId);
                          setTrackedComplaint(full);
                        } catch (error) {
                          setTrackError(error.message);
                          setTrackedComplaint(null);
                        }
                      }}
                    >
                      View Details
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? <div className="error">{submitError}</div> : null}
          {newComplaint ? <div className="success">Complaint created with ID: <strong>{newComplaint.complaintId}</strong></div> : null}
        </section>
      ) : null}

      <section className="card">
        <h3>Track Status by Complaint ID</h3>
        <form onSubmit={handleTrack} className="inline">
          <input
            placeholder="Enter complaint ID (e.g., CMP-20260310-ABC123)"
            value={trackId}
            onChange={(event) => setTrackId(event.target.value)}
            required
          />
          <button type="submit">Track</button>
        </form>

        {trackError ? <div className="error">{trackError}</div> : null}
        {trackedComplaint ? (
          <div className="tracked-card">
            <div className="small">Title: {trackedComplaint.title}</div>
            <div className="small">Description: {trackedComplaint.description || "N/A"}</div>
            <div className="small">Category: <span className="status-pill">{trackedComplaint.category || "Other"}</span></div>
            <div className="small">Status: <span className="status-pill">{trackedComplaint.status}</span></div>
            <div className="small">Priority: <span className="status-pill">{trackedComplaint.priority}</span></div>
            <div className="small">
              Assigned to:{" "}
              {trackedComplaint.assignedTo?.fullName
                ? `${trackedComplaint.assignedTo.fullName} (${trackedComplaint.assignedTo.role})`
                : "Not assigned yet"}
            </div>
            <div className="small">
              Worker completion: {trackedComplaint.workerTaskCompleted ? "Reported complete" : "Not marked complete"}
            </div>
            <div className="small">Archive State: {trackedComplaint.isArchived ? "Archived" : "Active"}</div>
            <div className="small">Last Updated: {formatDate(trackedComplaint.updatedAt)}</div>
            {trackedComplaint.submissionPhoto ? (
              <div className="tracked-media">
                <div className="small">Submitted photo</div>
                <img src={trackedComplaint.submissionPhoto} alt="Complaint submission" className="complaint-photo" />
              </div>
            ) : null}
            {trackedComplaint.location?.lat != null && trackedComplaint.location?.lng != null ? (
              <div className="tracked-media">
                <div className="small">Location on map</div>
                <ComplaintsMap
                  complaints={[
                    {
                      complaintId: trackedComplaint.complaintId,
                      title: trackedComplaint.title,
                      status: trackedComplaint.status,
                      priority: trackedComplaint.priority,
                      location: trackedComplaint.location
                    }
                  ]}
                />
              </div>
            ) : null}
            {Array.isArray(trackedComplaint.progressLogs) && trackedComplaint.progressLogs.length > 0 ? (
              <div className="progress-logs">
                <div className="small"><strong>Progress log</strong></div>
                <ul>
                  {[...trackedComplaint.progressLogs]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((log) => (
                      <li key={log._id || `${log.createdAt}-${log.text}`} className="progress-log-item">
                        <div className="small">
                          {formatDate(log.createdAt)} · {log.authorName} ·{" "}
                          <span className="status-pill">{log.entryType}</span>
                        </div>
                        <div>{log.text}</div>
                        {log.photoUrl ? (
                          <img src={log.photoUrl} alt="Progress attachment" className="complaint-photo thumb" />
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            {/* Citizen Feedback & Rating */}
            {trackedComplaint.feedback?.rating ? (
              <div className="feedback-display">
                <div className="small"><strong>Citizen Feedback</strong></div>
                <div className="rating-stars">
                  {"★".repeat(trackedComplaint.feedback.rating)}{"☆".repeat(5 - trackedComplaint.feedback.rating)}
                  <span className="small"> ({trackedComplaint.feedback.rating}/5)</span>
                </div>
                {trackedComplaint.feedback.comment ? (
                  <div className="small feedback-comment">{trackedComplaint.feedback.comment}</div>
                ) : null}
              </div>
            ) : null}
            {trackedComplaint.status === "Resolved" &&
              !trackedComplaint.feedback?.rating &&
              currentUser?.role === "Citizen" &&
              trackedComplaint.submittedBy === (currentUser.email || currentUser.phone || currentUser.fullName) ? (
              <div className="feedback-form">
                <div className="small"><strong>Rate this resolution</strong></div>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={star <= feedbackRating ? "star-btn active" : "star-btn"}
                      onClick={() => setFeedbackRating(star)}
                    >
                      {star <= feedbackRating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={feedbackComment}
                  onChange={(event) => setFeedbackComment(event.target.value)}
                  placeholder="Optional comment about the resolution..."
                />
                <button type="button" onClick={() => handleSubmitFeedback(trackedComplaint.complaintId)}>
                  Submit Feedback
                </button>
                {feedbackMessage ? <div className="small">{feedbackMessage}</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <>
          <section className="card">
            <h3>Admin: User Management</h3>
            <p className="small">Assign roles as Citizen, Worker, MP, or Admin for any registered user.</p>
            {userAdminMessage ? <div className="small">{userAdminMessage}</div> : null}
            {users.length === 0 ? <div className="small">No users available.</div> : null}
            <div className="user-list">
              {users.map((user) => (
                <article key={user.id} className="user-item">
                  <div>
                    <strong>{user.fullName}</strong>
                    <div className="small">{user.email || user.phone || "No contact info"}</div>
                    <div className="small">Current Role: {user.role}</div>
                  </div>
                  <div className="user-actions">
                    <select
                      value={roleSelections[user.id] || user.role}
                      onChange={(event) => {
                        setRoleSelections((previous) => ({
                          ...previous,
                          [user.id]: event.target.value
                        }));
                      }}
                    >
                      {ROLE_ASSIGN_OPTIONS.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>{roleOption}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleRoleUpdate(user.id)}>Save Role</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>Admin: Update Status</h3>
            <form onSubmit={handleAdminUpdate}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>New Status</label>
              <select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value)}>
                {STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <button type="submit">Update Status</button>
            </form>
            {adminMessage ? <div className="small">{adminMessage}</div> : null}
          </section>

          <section className="card">
            <h3>Admin: Set Priority Level</h3>
            <form onSubmit={handlePriorityUpdate}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>Priority Level</label>
              <select value={adminPriority} onChange={(event) => setAdminPriority(event.target.value)}>
                {PRIORITY_VALUES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>

              <button type="submit">Update Priority</button>
            </form>
          </section>

          <section className="card">
            <h3>Admin: Assign to Worker or MP</h3>
            <p className="small">Route a complaint to a worker or MP. Status is set to Assigned automatically.</p>
            <form onSubmit={handleAssignComplaint}>
              <label>Complaint ID</label>
              <input value={adminId} onChange={(event) => setAdminId(event.target.value)} required />

              <label>Assignee</label>
              <select
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select worker or MP
                </option>
                {users
                  .filter((user) => ["Worker", "MP"].includes(user.role))
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </option>
                  ))}
              </select>

              <button type="submit" disabled={!assigneeUserId}>
                Assign complaint
              </button>
            </form>
            {assignMessage ? <div className="small">{assignMessage}</div> : null}
            {users.filter((user) => ["Worker", "MP"].includes(user.role)).length === 0 ? (
              <div className="small">No Worker or MP users yet. Promote accounts under User Management first.</div>
            ) : null}
          </section>

          {/* Analytics Dashboard */}
          <section className="card">
            <h3>Analytics Dashboard</h3>
            <div className="analytics-actions">
              <button type="button" onClick={() => loadAnalytics()}>Refresh Analytics</button>
            </div>
            {analyticsError ? <div className="error">{analyticsError}</div> : null}
            {analytics ? (
              <div className="analytics-dashboard">
                <div className="dashboard-grid">
                  <div className="dashboard-stat">
                    <span className="stat-label">Total Complaints</span>
                    <strong>{analytics.totalComplaints}</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Total Users</span>
                    <strong>{analytics.totalUsers}</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Overdue</span>
                    <strong className="overdue-count">{analytics.overdueCount}</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Avg Rating</span>
                    <strong>{analytics.feedbackStats.totalRatings > 0
                      ? `${Math.round(analytics.feedbackStats.avgRating * 10) / 10}/5`
                      : "N/A"}</strong>
                  </div>
                </div>

                <h4>Complaints by Status</h4>
                <div className="chart-bar-group">
                  {analytics.statusCounts.map((s) => (
                    <div key={s.status} className="chart-bar-item">
                      <span className="chart-bar-label">{s.status}</span>
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar-fill"
                          style={{ width: `${Math.min((s.count / Math.max(analytics.totalComplaints, 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="chart-bar-value">{s.count}</span>
                    </div>
                  ))}
                </div>

                <h4>Complaints by Priority</h4>
                <div className="chart-bar-group">
                  {analytics.priorityCounts.map((p) => (
                    <div key={p.priority} className="chart-bar-item">
                      <span className="chart-bar-label">{p.priority}</span>
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar-fill priority-bar"
                          style={{ width: `${Math.min((p.count / Math.max(analytics.totalComplaints, 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="chart-bar-value">{p.count}</span>
                    </div>
                  ))}
                </div>

                <h4>Resolution Times</h4>
                <div className="dashboard-grid">
                  <div className="dashboard-stat">
                    <span className="stat-label">Total Resolved</span>
                    <strong>{analytics.resolution.totalResolved}</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Avg Time</span>
                    <strong>{analytics.resolution.avgHours}h</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Min Time</span>
                    <strong>{analytics.resolution.minHours}h</strong>
                  </div>
                  <div className="dashboard-stat">
                    <span className="stat-label">Max Time</span>
                    <strong>{analytics.resolution.maxHours}h</strong>
                  </div>
                </div>

                <h4>Monthly Volume (Last 12 Months)</h4>
                {analytics.monthlyVolume.length === 0 ? (
                  <div className="small">No data available yet.</div>
                ) : (
                  <div className="chart-bar-group">
                    {analytics.monthlyVolume.map((m) => {
                      const maxCount = Math.max(...analytics.monthlyVolume.map((mv) => mv.count), 1);
                      return (
                        <div key={`${m.year}-${m.month}`} className="chart-bar-item">
                          <span className="chart-bar-label">{m.year}-{String(m.month).padStart(2, "0")}</span>
                          <div className="chart-bar-track">
                            <div
                              className="chart-bar-fill monthly-bar"
                              style={{ width: `${(m.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="chart-bar-value">{m.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <h4>Worker Performance</h4>
                {analytics.workerPerformance.length === 0 ? (
                  <div className="small">No worker data available yet.</div>
                ) : (
                  <div className="worker-perf-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th>Role</th>
                          <th>Assigned</th>
                          <th>Resolved</th>
                          <th>Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.workerPerformance.map((w) => (
                          <tr key={w.workerId}>
                            <td>{w.fullName}</td>
                            <td>{w.role}</td>
                            <td>{w.totalAssigned}</td>
                            <td>{w.resolved}</td>
                            <td>{w.completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="small">Loading analytics...</div>
            )}
          </section>

          {/* Deadline & SLA Tracking */}
          <section className="card">
            <h3>Deadline & SLA Tracking</h3>
            <p className="small">Set due dates for complaints and track overdue ones.</p>
            <form onSubmit={handleSetDeadline}>
              <label>Complaint ID</label>
              <input
                value={deadlineComplaintId}
                onChange={(event) => setDeadlineComplaintId(event.target.value)}
                required
              />
              <label>Deadline Date</label>
              <input
                type="datetime-local"
                value={deadlineDate}
                onChange={(event) => setDeadlineDate(event.target.value)}
                required
              />
              <button type="submit">Set Deadline</button>
            </form>
            {deadlineMessage ? <div className="small">{deadlineMessage}</div> : null}

            <h4>Overdue Complaints ({overdueComplaints.length})</h4>
            <button type="button" className="secondary-button" onClick={() => loadOverdue()}>Refresh Overdue</button>
            {overdueComplaints.length === 0 ? (
              <div className="small">No overdue complaints found.</div>
            ) : (
              <div className="overdue-list">
                {overdueComplaints.map((c) => (
                  <article key={c._id} className="history-item overdue-item">
                    <div className="history-topline">
                      <strong>{c.complaintId}</strong>
                      <span className="archive-pill overdue-pill">OVERDUE</span>
                    </div>
                    <div>{c.title}</div>
                    <div className="small">Status: {c.status} | Priority: {c.priority}</div>
                    <div className="small overdue-date">
                      Deadline: {formatDate(c.deadline)}
                    </div>
                    <div className="small">
                      Assigned to: {c.assignedTo?.fullName || "Unassigned"}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Export Reports */}
          <section className="card">
            <h3>Export Reports</h3>
            <p className="small">Download complaint data as CSV or printable PDF report.</p>
            <div className="export-actions">
              <button type="button" onClick={handleExportCSV}>Export CSV</button>
              <button type="button" onClick={handleExportPDF}>Export PDF Report</button>
            </div>
            {exportMessage ? <div className="small">{exportMessage}</div> : null}
          </section>
        </>
      ) : null}

      {isWorkerOrMp ? (
        <section className="card">
          <h3>Worker / MP: Progress updates</h3>
          <p className="small">
            Add text and optional photo proof for your assigned complaint, or mark the task complete when finished.
          </p>

          {complaints.length === 0 ? (
            <div className="small">No complaints are assigned to you yet.</div>
          ) : (
            <>
              <label>Assigned complaint</label>
              <select value={workComplaintId} onChange={(event) => setWorkComplaintId(event.target.value)}>
                {complaints.map((complaint) => (
                  <option key={complaint._id} value={complaint.complaintId}>
                    {complaint.complaintId} — {complaint.title}
                  </option>
                ))}
              </select>

              <label>Update details</label>
              <textarea
                rows={4}
                value={workUpdateText}
                onChange={(event) => setWorkUpdateText(event.target.value)}
                placeholder="Describe what you did on site..."
              />

              <label>Photo proof (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setWorkPhotoFile(file || null);
                }}
              />

              <div className="worker-actions">
                <button type="button" onClick={() => submitWorkerUpdate({ markCompleted: false })}>
                  Submit update
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => submitWorkerUpdate({ markCompleted: true })}
                >
                  Task completed
                </button>
              </div>
            </>
          )}

          {workMessage ? <div className="small">{workMessage}</div> : null}
        </section>
      ) : null}

      {isWorkerOrMp && workerDashData ? (
        <section className="card">
          <h3>Worker Dashboard</h3>
          <div className="dashboard-grid">
            <div className="dashboard-stat">
              <span className="stat-label">Total Assigned</span>
              <strong>{workerDashData.stats.totalAssigned}</strong>
            </div>
            <div className="dashboard-stat">
              <span className="stat-label">Active Tasks</span>
              <strong>{workerDashData.stats.totalPending}</strong>
            </div>
            <div className="dashboard-stat">
              <span className="stat-label">Completed</span>
              <strong>{workerDashData.stats.totalCompleted}</strong>
            </div>
            <div className="dashboard-stat">
              <span className="stat-label">Resolved</span>
              <strong>{workerDashData.stats.totalResolved}</strong>
            </div>
          </div>

          {workerDashData.activeComplaints.length > 0 ? (
            <>
              <h4 style={{ marginTop: "16px" }}>Active Tasks</h4>
              {workerDashData.activeComplaints.map((c) => (
                <article key={c._id} className="history-item">
                  <div className="history-topline">
                    <strong>{c.complaintId}</strong>
                    <span className="status-pill">{c.status}</span>
                  </div>
                  <div>{c.title}</div>
                  <div className="small">Category: {c.category || "Other"} | Priority: {c.priority}</div>
                  <div className="small">Submitted by: {c.citizenId?.fullName || c.submittedBy}</div>
                  <div className="small">Created: {formatDate(c.createdAt)}</div>
                </article>
              ))}
            </>
          ) : (
            <div className="small" style={{ marginTop: "12px" }}>No active tasks right now.</div>
          )}

          {workerDashData.completedComplaints.length > 0 ? (
            <>
              <h4 style={{ marginTop: "16px" }}>Recently Completed</h4>
              {workerDashData.completedComplaints.slice(0, 5).map((c) => (
                <article key={c._id} className="history-item">
                  <div className="history-topline">
                    <strong>{c.complaintId}</strong>
                    <span className="archive-pill archived">Completed</span>
                  </div>
                  <div>{c.title}</div>
                  <div className="small">Completed: {formatDate(c.updatedAt)}</div>
                </article>
              ))}
            </>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h3>Comment / Discussion</h3>
        <p className="small">Enter a complaint ID to view and add comments to the discussion thread.</p>
        <div className="inline">
          <input
            placeholder="Enter complaint ID"
            value={commentComplaintId}
            onChange={(e) => setCommentComplaintId(e.target.value)}
          />
          <button type="button" onClick={() => handleLoadComments(commentComplaintId)}>Load</button>
        </div>

        {commentComplaintId && commentList.length > 0 ? (
          <div className="comment-thread">
            {commentList.map((comment) => (
              <div key={comment._id} className="comment-item">
                <div className="comment-author">
                  <strong>{comment.authorName}</strong>
                  <span className="status-pill">{comment.authorRole}</span>
                  <span className="small">{formatDate(comment.createdAt)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            ))}
          </div>
        ) : commentComplaintId ? (
          <div className="small" style={{ marginTop: "8px" }}>No comments yet for this complaint.</div>
        ) : null}

        {commentComplaintId ? (
          <form onSubmit={handleAddComment} style={{ marginTop: "12px" }}>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              maxLength={1000}
            />
            <button type="submit">Post Comment</button>
          </form>
        ) : null}

        {commentMessage ? <div className="small">{commentMessage}</div> : null}
      </section>

      {isAdmin ? (
        <section className="card">
          <h3>Category-wise Reports</h3>
          <p className="small">Breakdown of complaints by category with resolution statistics.</p>
          <button type="button" className="secondary-button" style={{ width: "auto", marginBottom: "12px" }} onClick={() => loadCategoryReports()}>
            Refresh Reports
          </button>

          {categoryReports.length > 0 ? (
            <div className="category-reports-table-wrap">
              <table className="category-reports-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>Assigned</th>
                    <th>In Progress</th>
                    <th>Resolved</th>
                    <th>Rejected</th>
                    <th>Resolution %</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReports.map((report) => (
                    <tr key={report.category}>
                      <td>{report.category}</td>
                      <td><strong>{report.total}</strong></td>
                      <td>{report.pending}</td>
                      <td>{report.assigned}</td>
                      <td>{report.inProgress}</td>
                      <td>{report.resolved}</td>
                      <td>{report.rejected}</td>
                      <td>
                        <div className="resolution-bar-wrap">
                          <div className="resolution-bar" style={{ width: `${report.resolutionRate}%` }} />
                          <span>{report.resolutionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small">No data available yet.</div>
          )}
        </section>
      ) : null}

      <section className="card history-archive-card">
        <div className="section-heading">
          <div>
            <h3>Complaint History and Archive</h3>
            <p className="small">
              {currentUser.role === "Admin" || currentUser.role === "Super Admin"
                ? "Admins can see all complaints and switch between active and archived records. Each row can include its own map when coordinates were saved."
                : isWorkerOrMp
                  ? "You see complaints assigned to you. Each entry may show a location map if the citizen provided one."
                  : "Citizens can see their complaint history, including archived items. A small map appears on each complaint that has a saved location."}
            </p>
          </div>
          <div className="filter-row">
            <button type="button" className={historyFilter === "all" ? "tab active" : "tab"} onClick={() => setHistoryFilter("all")}>All</button>
            <button type="button" className={historyFilter === "active" ? "tab active" : "tab"} onClick={() => setHistoryFilter("active")}>Active</button>
            <button type="button" className={historyFilter === "archived" ? "tab active" : "tab"} onClick={() => setHistoryFilter("archived")}>Archived</button>
          </div>
        </div>

        {complaints.length === 0 ? <div className="small">No complaints found for this view.</div> : null}
        {complaints.map((complaint) => {
          const hasMapLocation =
            complaint.location &&
            typeof complaint.location.lat === "number" &&
            typeof complaint.location.lng === "number";

          return (
            <article key={complaint._id} className="history-item">
              <div className="history-topline">
                <strong>{complaint.complaintId}</strong>
                <span className={complaint.isArchived ? "archive-pill archived" : "archive-pill active-archive"}>
                  {complaint.isArchived ? "Archived" : "Active"}
                </span>
              </div>
              <div>{complaint.title}</div>
              <div className="small">{complaint.description}</div>
              <div className="small">Category: {complaint.category || "Other"} | Status: {complaint.status} | Priority: {complaint.priority}</div>
              <div className="small">Submitted by: {complaint.citizenId?.fullName || complaint.submittedBy}</div>
              {complaint.assignedTo ? (
                <div className="small">
                  Assigned to: {complaint.assignedTo.fullName} ({complaint.assignedTo.role})
                </div>
              ) : null}
              <div className="small">Created: {formatDate(complaint.createdAt)}</div>

              {complaint.deadline ? (
                <div className={`small ${complaint.deadline && new Date(complaint.deadline) < new Date() && !["Resolved", "Rejected"].includes(complaint.status) ? "overdue-date" : ""}`}>
                  Deadline: {formatDate(complaint.deadline)}
                  {complaint.deadline && new Date(complaint.deadline) < new Date() && !["Resolved", "Rejected"].includes(complaint.status) ? " (OVERDUE)" : ""}
                </div>
              ) : null}

              {complaint.feedback?.rating ? (
                <div className="small">
                  Rating: {"★".repeat(complaint.feedback.rating)}{"☆".repeat(5 - complaint.feedback.rating)} ({complaint.feedback.rating}/5)
                  {complaint.feedback.comment ? ` — "${complaint.feedback.comment}"` : ""}
                </div>
              ) : null}

              {hasMapLocation ? (
                <div className="history-item-map">
                  <div className="small history-item-map-label">Location</div>
                  <ComplaintsMap complaints={[complaint]} variant="mini" />
                </div>
              ) : (
                <div className="small history-item-map-missing">No map location was provided for this complaint.</div>
              )}
            </article>
          );
        })}
      </section>

      {!isAdmin ? (
        <section className="card">
          <h3>Help Center (FAQ)</h3>
          <p>Common questions for using ComplaintHub.</p>
          <ul className="faq-list">
            <li>
              <strong>Q: How do I sign up?</strong>
              <div>A: Open the Sign Up page, enter your name, email, optional phone, and a password with at least 6 characters.</div>
            </li>
            <li>
              <strong>Q: How do I log in?</strong>
              <div>A: Use the Login page with your email or phone and password.</div>
            </li>
            <li>
              <strong>Q: How do I submit a complaint?</strong>
              <div>A: After logging in, use the Submit Complaint form and keep the generated complaint ID for tracking.</div>
            </li>
            <li>
              <strong>Q: How can I track complaint status?</strong>
              <div>A: Use the Track Status by Complaint ID section and enter the ID created when the complaint was submitted.</div>
            </li>
            <li>
              <strong>Q: Where can I see old complaints?</strong>
              <div>A: Use the Complaint History and Archive section and switch between All, Active, and Archived.</div>
            </li>
            <li>
              <strong>Q: Who can update status and priority?</strong>
              <div>A: Admin users can update complaint status and priority after logging in with admin credentials.</div>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
