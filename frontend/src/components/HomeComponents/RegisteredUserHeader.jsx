import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Copy, LogOut, X } from "lucide-react";
import backendUrl from "@/config/api.js";

export default function RegisteredUserHeader({ user, onLogout }) {
  const navigate = useNavigate();
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [remainingGenerations, setRemainingGenerations] = useState(
    Math.max(0, user?.remaining_generations ?? 5)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const initial = user?.fullName?.charAt(0).toUpperCase() || user?.full_name?.charAt(0).toUpperCase() || "U";

  const isAdmin = user?.role === "ADMIN";
  const isMember = !isAdmin && (user?.membership_status === "MEMBER" || user?.membershipStatus === "MEMBER");
  const applicationStatus = user?.application_status;
  const applicationStatusLabel = {
    PENDING: "Application Submitted — Pending",
    UNDER_REVIEW: "Application Under Review",
    REJECTED: "Application Rejected",
  }[applicationStatus];

  useEffect(() => {
    if (!isReferralModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsReferralModalOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReferralModalOpen]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("token");

    if (!token) return undefined;

    fetch(`${backendUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load notifications.");
        if (active) {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        }
      })
      .catch((notificationError) => {
        if (active) setNotificationsError(notificationError.message || "Unable to load notifications.");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleGenerateCode = async () => {
    setError("");
    setCopied(false);
    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in to generate a referral code.");
      }

      const response = await fetch(`${backendUrl}/api/invitations/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to generate a referral code.");
      }

      setReferralCode(data.referralCode);
      setRemainingGenerations(data.remaining_generations);
    } catch (generationError) {
      setError(generationError.message || "Unable to connect to the server.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setError("");
    } catch {
      setError("Unable to copy the code. Please copy it manually.");
      setCopied(false);
    }
  };

  const handleToggleNotifications = async () => {
    const opening = !isNotificationsOpen;
    setIsNotificationsOpen(opening);
    if (!opening) return;

    setNotificationsError("");
    setNotificationsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications.");
      }

      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (notificationError) {
      setNotificationsError(notificationError.message || "Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/notifications/${encodeURIComponent(notificationId)}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update the notification.");
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: data.notification.read_at }
            : notification
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (notificationError) {
      setNotificationsError(notificationError.message || "Unable to update the notification.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout?.();
    navigate("/");
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-green-100 bg-white px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold text-green-800">Art ShowCase</h1>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-800">{initial}</div>

          <span className="hidden text-sm font-medium text-gray-700 sm:block">{user?.fullName || user?.full_name || "User"}</span>

          <div className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={isNotificationsOpen}
              className="relative rounded-lg border border-green-100 p-2 text-green-800 transition hover:bg-green-50"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <section className="absolute right-0 top-full z-40 mt-2 w-[min(90vw,22rem)] overflow-hidden rounded-xl border border-green-100 bg-white shadow-xl">
                <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Notifications</h2>
                <div className="max-h-80 overflow-y-auto">
                  {notificationsLoading ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">Loading notifications...</p>
                  ) : notificationsError ? (
                    <p role="alert" className="px-4 py-5 text-sm text-red-600">{notificationsError}</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">You are all caught up.</p>
                  ) : (
                    notifications.map((notification) => (
                      <article
                        key={notification.id}
                        className={`border-b border-gray-50 px-4 py-3 last:border-0 ${notification.read_at ? "" : "bg-green-50/70"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{notification.title}</h3>
                            <p className="mt-1 text-xs leading-5 text-gray-600">{notification.body}</p>
                            <p className="mt-2 text-[11px] text-gray-400">
                              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}
                            </p>
                          </div>
                          {!notification.read_at && (
                            <button
                              type="button"
                              onClick={() => handleMarkNotificationRead(notification.id)}
                              className="shrink-0 text-xs font-semibold text-green-800 hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>

          {isAdmin && (
            <>
              <span className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">
                ArtSpace Admin
              </span>
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="rounded-lg border border-green-700 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-50"
              >
                Admin Dashboard
              </button>
            </>
          )}

          {user?.role !== "ADMIN" && (
            <a
              href="/admin/login"
              className="shrink-0 rounded-lg border border-green-200 px-2 py-2 text-xs font-medium text-green-800 hover:bg-green-50 sm:px-3 sm:text-sm"
            >
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Admin Login</span>
            </a>
          )}

          {isAdmin ? null : isMember ? (
            <>
              <span className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">✓ ArtSpace Member</span>

              <button
                type="button"
                onClick={() => setIsReferralModalOpen(true)}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-800"
              >
                Generate Referral Code
              </button>
            </>
          ) : (
            <>
              {applicationStatusLabel ? (
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="max-w-48 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900 sm:max-w-none sm:text-sm"
                    role="status"
                  >
                    {applicationStatusLabel}
                  </span>
                  {applicationStatus === "REJECTED" && (
                    <a href="/applyformembership" className="text-xs font-semibold text-green-800 hover:underline">
                      Apply again
                    </a>
                  )}

                </div>
              ) : (
                <a
                  href="/applyformembership"
                  className="rounded-lg border border-green-700 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
                >
                  Become a Member
                </a>
              )}

              <a
                href="/application-status"
                className="hidden rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 sm:block"
              >
                Application Status
              </a>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-3"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {isReferralModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-6"
          onClick={() => setIsReferralModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="referral-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-green-700">ArtSpace Member</p>
                <h2 id="referral-modal-title" className="text-2xl font-bold text-green-950">Your referral code</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                aria-label="Close referral code dialog"
                className="rounded-full p-2 text-gray-500 transition hover:bg-green-50 hover:text-green-900"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-5 text-sm leading-6 text-gray-600">
              Generate a single-use code to invite someone to apply for ArtSpace membership.
            </p>

            {referralCode && (
              <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-800">Referral code</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="break-all text-lg font-bold tracking-wider text-green-950">{referralCode}</code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label={copied ? "Referral code copied" : "Copy referral code"}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <p className="mb-5 text-sm font-medium text-gray-700" aria-live="polite">
              {remainingGenerations} {remainingGenerations === 1 ? "generation" : "generations"} remaining
            </p>

            {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={isGenerating || remainingGenerations === 0}
              className="w-full rounded-xl bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating
                ? "Generating..."
                : remainingGenerations === 0
                  ? "No generations remaining"
                  : referralCode
                    ? "Generate another code"
                    : "Generate code"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
