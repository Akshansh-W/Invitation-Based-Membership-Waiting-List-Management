import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  Check,
  ClipboardList,
  Copy,
  LayoutDashboard,
  LogOut,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import backendUrl from "@/config/api.js";

const API_URL = `${backendUrl}/api/admin`;

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function statusLabel(status) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status) {
  if (status === "APPROVED" || status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "REJECTED" || status === "REVOKED" || status === "EXPIRED") return "bg-red-100 text-red-700";
  if (status === "UNDER_REVIEW") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

async function adminRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
    }
    throw new Error(data.message || "Unable to complete the request.");
  }

  return data;
}

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.endsWith("/applications")
    ? "applications"
    : location.pathname.endsWith("/referrals")
      ? "referrals"
      : "members";
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loadedSection, setLoadedSection] = useState("");
  const [requestError, setRequestError] = useState(null);
  const loading = loadedSection !== section;
  const error = requestError?.section === section ? requestError.message : "";
  const [search, setSearch] = useState("");
  const [referralFilter, setReferralFilter] = useState("ALL");
  const [memberSort, setMemberSort] = useState("newest");
  const [updatingId, setUpdatingId] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [adminReferralCode, setAdminReferralCode] = useState("");
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    let active = true;

    const request = section === "applications"
      ? adminRequest("/applications")
      : section === "referrals"
        ? adminRequest("/referrals")
        : Promise.all([adminRequest("/members"), adminRequest("/referrals")]);

    request
      .then((data) => {
        if (!active) return;
        setRequestError(null);
        if (section === "applications") setApplications(data.applications);
        else if (section === "referrals") setReferrals(data.referrals);
        else {
          const [memberData, referralData] = data;
          const issuedCodesByCreator = new Map();
          for (const referral of referralData.referrals) {
            const creatorEmail = referral.creator?.email?.toLowerCase();
            if (creatorEmail) {
              issuedCodesByCreator.set(
                creatorEmail,
                (issuedCodesByCreator.get(creatorEmail) || 0) + 1
              );
            }
          }

          setMembers(
            memberData.members.map((member) => ({
              ...member,
              referral_codes:
                member.referral_codes ??
                issuedCodesByCreator.get(member.email.toLowerCase()) ??
                0,
            }))
          );
        }
      })
      .catch((requestError) => {
        if (active) {
          setRequestError({
            section,
            message: requestError.message || "Unable to load administrator data.",
          });
          if (/session has expired|administrator access/i.test(requestError.message)) {
            navigate("/admin/login", { replace: true });
          }
        }
      })
      .finally(() => {
        if (active) setLoadedSection(section);
      });

    return () => {
      active = false;
    };
  }, [section, navigate]);

  const visibleMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return members
      .filter((member) => {
        const matchesSearch = !normalizedSearch ||
          member.name.toLowerCase().includes(normalizedSearch) ||
          member.email.toLowerCase().includes(normalizedSearch);
        const matchesReferrals = referralFilter === "ALL" ||
          (referralFilter === "USED" ? member.referrals_used > 0 : member.referrals_used === 0);
        return matchesSearch && matchesReferrals;
      })
      .sort((left, right) => {
        if (memberSort === "name") return left.name.localeCompare(right.name);
        if (memberSort === "referrals") return right.referrals_used - left.referrals_used;
        const leftDate = new Date(left.registered_at || 0).getTime();
        const rightDate = new Date(right.registered_at || 0).getTime();
        return memberSort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
      });
  }, [members, search, referralFilter, memberSort]);

  const updateApplication = async (application, updates) => {
    setUpdatingId(application.id);
    setRequestError(null);

    try {
      const data = await adminRequest(`/applications/${encodeURIComponent(application.id)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      if (data.application.status === "APPROVED") {
        setApplications((current) => current.filter((item) => item.id !== application.id));
      } else {
        setApplications((current) =>
          current.map((item) =>
            item.id === application.id
              ? {
                  ...item,
                  status: data.application.status,
                  priority: data.application.priority,
                  rejection_reason: data.application.rejection_reason,
                }
              : item
          )
        );
      }
    } catch (requestError) {
      setRequestError({
        section,
        message: requestError.message || "Unable to update the application.",
      });
      if (/session has expired|administrator access/i.test(requestError.message)) {
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setUpdatingId("");
    }
  };

  const generateAdminReferral = async () => {
    setIsGeneratingReferral(true);
    setAdminReferralCode("");
    setCopiedReferral(false);
    setRequestError(null);

    try {
      const data = await adminRequest("/referrals/generate", { method: "POST" });
      setAdminReferralCode(data.referralCode);
      const referralData = await adminRequest("/referrals");
      setReferrals(referralData.referrals);
    } catch (requestError) {
      setRequestError({
        section: "referrals",
        message: requestError.message || "Unable to generate an administrator referral code.",
      });
      if (/session has expired|administrator access/i.test(requestError.message)) {
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const copyAdminReferral = async () => {
    try {
      await navigator.clipboard.writeText(adminReferralCode);
      setCopiedReferral(true);
      setRequestError(null);
    } catch {
      setRequestError({
        section: "referrals",
        message: "Unable to copy the code. Please copy it manually.",
      });
      setCopiedReferral(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard / Members", icon: Users, key: "members" },
    { to: "/admin/dashboard/applications", label: "Membership Applications", icon: ClipboardList, key: "applications" },
    { to: "/admin/dashboard/referrals", label: "Referral Management", icon: Ticket, key: "referrals" },
  ];
  const pageTitle = section === "applications"
    ? "Membership Applications"
    : section === "referrals"
      ? "Referral Management"
      : "Members";

  return (
    <div className="min-h-screen bg-green-50 lg:flex">
      <aside className="bg-white px-4 py-5 shadow-sm lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:px-5 lg:py-7">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 text-xl font-bold text-green-900">
          <LayoutDashboard size={22} />
          ArtSpace Admin
        </Link>

        <nav aria-label="Admin navigation" className="flex gap-2 overflow-x-auto lg:flex-1 lg:flex-col">
          {navItems.map(({ to, label, icon: Icon, key }) => (
            <NavLink
              key={key}
              to={to}
              end={key === "members"}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive ? "bg-green-100 text-green-900" : "text-gray-600 hover:bg-green-50 hover:text-green-900"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700 lg:mt-auto"
        >
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-green-700">Administration</p>
            <h1 className="text-3xl font-bold text-green-950">{pageTitle}</h1>
          </div>
          <Link to="/" className="text-sm font-medium text-green-800 hover:underline">View ArtSpace</Link>
        </header>

        {error && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {section === "members" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">ArtSpace Members</h2>
                <p className="mt-1 text-sm text-gray-500">{members.length} members</p>
                <p className="mt-1 text-xs text-gray-500">
                  Successful invites total redemptions across a member&apos;s codes; Referral Management shows each code separately.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Search members</span>
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name or email"
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-600 sm:w-56"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter members by successful invites</span>
                  <select
                    value={referralFilter}
                    onChange={(event) => setReferralFilter(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-600"
                  >
                    <option value="ALL">All successful invites</option>
                    <option value="USED">Has successful invites</option>
                    <option value="UNUSED">No successful invites</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <ArrowDownUp size={15} className="text-gray-500" />
                  <span className="sr-only">Sort members</span>
                  <select
                    value={memberSort}
                    onChange={(event) => setMemberSort(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name</option>
                    <option value="referrals">Most referrals</option>
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-gray-500">Loading members...</p>
            ) : visibleMembers.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">No members match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3 font-semibold">Member</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Registered</th>
                      <th className="px-3 py-3 font-semibold">Codes issued</th>
                      <th className="px-3 py-3 font-semibold">Successful invites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="mt-1 text-gray-500">{member.email}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(member.membership_status)}`}>
                            {statusLabel(member.membership_status)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-gray-600">{formatDate(member.registered_at)}</td>
                        <td className="px-3 py-4 font-medium text-gray-800">{member.referral_codes}</td>
                        <td className="px-3 py-4 font-medium text-gray-800">{member.referrals_used}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {section === "applications" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Waiting list</h2>
                <p className="mt-1 text-sm text-gray-500">Review applicants and update their application status.</p>
              </div>
              <label className="relative">
                <span className="sr-only">Search applications</span>
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search applicants"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-600 sm:w-56"
                />
              </label>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-gray-500">Loading applications...</p>
            ) : applications.filter((application) =>
              `${application.applicant?.name || ""} ${application.applicant?.email || ""}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())
            ).length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">No membership applications to review.</p>
            ) : (
              <div className="space-y-4">
                {applications
                  .filter((application) =>
                    `${application.applicant?.name || ""} ${application.applicant?.email || ""}`
                      .toLowerCase()
                      .includes(search.trim().toLowerCase())
                  )
                  .map((application) => (
                    <article key={application.id} className="rounded-xl border border-gray-100 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{application.applicant?.name || "Account unavailable"}</h3>
                          <p className="mt-1 text-sm text-gray-600">{application.applicant?.email || "—"}</p>
                          <p className="mt-2 text-sm text-gray-500">
                            {application.designation || "Designation not provided"}
                            {application.company ? ` · ${application.company}` : ""}
                            {application.experience_years != null ? ` · ${application.experience_years} years' experience` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(application.status)}`}>
                          {statusLabel(application.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                        <p><span className="font-medium text-gray-800">Submitted:</span> {formatDate(application.submitted_at)}</p>
                        <p><span className="font-medium text-gray-800">Registered:</span> {formatDate(application.applicant?.registered_at)}</p>
                        <p>
                          <span className="font-medium text-gray-800">Invited by:</span>{" "}
                          {application.inviter ? `${application.inviter.name} (${application.inviter.email})` : "—"}
                        </p>
                      </div>

                      {application.rejection_reason && (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                          Rejection reason: {application.rejection_reason}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                          Priority
                          <select
                            value={application.priority}
                            disabled={updatingId === application.id}
                            onChange={(event) => updateApplication(application, { priority: event.target.value })}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-green-600"
                          >
                            <option value="CRITICAL">Critical</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                          </select>
                        </label>

                        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-gray-600">
                          Rejection reason <span className="font-normal">(optional)</span>
                          <input
                            type="text"
                            maxLength={1000}
                            value={rejectionReasons[application.id] || ""}
                            onChange={(event) =>
                              setRejectionReasons((current) => ({ ...current, [application.id]: event.target.value }))
                            }
                            placeholder="Share a reason with the applicant"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-green-600"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingId === application.id || application.status === "UNDER_REVIEW"}
                            onClick={() => updateApplication(application, { status: "UNDER_REVIEW" })}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                          >
                            Under review
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === application.id}
                            onClick={() => updateApplication(application, { status: "REJECTED", rejection_reason: rejectionReasons[application.id] || "" })}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === application.id}
                            onClick={() => updateApplication(application, { status: "APPROVED" })}
                            className="rounded-lg bg-green-800 px-3 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
                          >
                            {updatingId === application.id ? "Saving..." : "Approve"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        )}

        {section === "referrals" && (
          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Referral activity</h2>
                <p className="mt-1 text-sm text-gray-500">Each row shows usage for one code. Member totals combine successful redemptions across all codes issued by that member. Referral codes are stored securely as hashes.</p>
              </div>
              <button
                type="button"
                onClick={generateAdminReferral}
                disabled={loading || isGeneratingReferral}
                className="rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingReferral ? "Generating..." : "Generate referral code"}
              </button>
            </div>

            {adminReferralCode && (
              <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-green-900">New one-use referral code</p>
                  <p className="mt-1 font-mono text-lg tracking-wider text-green-950">{adminReferralCode}</p>
                  <p className="mt-1 text-xs text-green-800">Share this code now; it is only shown once and expires in 90 days.</p>
                </div>
                <button
                  type="button"
                  onClick={copyAdminReferral}
                  className="flex items-center gap-2 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-100"
                >
                  {copiedReferral ? <Check size={16} /> : <Copy size={16} />}
                  {copiedReferral ? "Copied" : "Copy code"}
                </button>
              </div>
            )}

            {loading ? (
              <p className="py-12 text-center text-sm text-gray-500">Loading referrals...</p>
            ) : referrals.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">No referral codes have been generated.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3 font-semibold">Created by</th>
                      <th className="px-3 py-3 font-semibold">Invitation</th>
                      <th className="px-3 py-3 font-semibold">Uses</th>
                      <th className="px-3 py-3 font-semibold">Created</th>
                      <th className="px-3 py-3 font-semibold">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral) => (
                      <tr key={referral.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-gray-900">{referral.creator?.name || "Account unavailable"}</p>
                          <p className="mt-1 text-gray-500">{referral.creator?.email || "—"}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(referral.status)}`}>
                            {statusLabel(referral.status)}
                          </span>
                          <p className="mt-2 max-w-48 truncate text-xs text-gray-400" title={referral.id}>{referral.id}</p>
                        </td>
                        <td className="px-3 py-4 font-medium text-gray-800">{referral.uses} / {referral.max_uses}</td>
                        <td className="px-3 py-4 text-gray-600">{formatDate(referral.created_at)}</td>
                        <td className="px-3 py-4 text-gray-600">{formatDate(referral.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
