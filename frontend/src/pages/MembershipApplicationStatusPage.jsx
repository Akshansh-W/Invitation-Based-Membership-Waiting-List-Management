import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import backendUrl from "@/config/api.js";

const statusDetails = {
  PENDING: {
    title: "Application Submitted — Pending",
    description: "Your application is in the waiting list and has not yet been reviewed.",
    style: "bg-amber-50 text-amber-900",
  },
  UNDER_REVIEW: {
    title: "Application Under Review",
    description: "An administrator is reviewing your membership application.",
    style: "bg-blue-50 text-blue-900",
  },
  APPROVED: {
    title: "Membership Approved",
    description: "Your application was approved. Welcome to the ArtSpace community!",
    style: "bg-green-50 text-green-900",
  },
  REJECTED: {
    title: "Application Rejected",
    description: "Your membership application was declined.",
    style: "bg-red-50 text-red-900",
  },
};

export default function MembershipApplicationStatusPage() {
  const [application, setApplication] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your application status.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/membership/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load application status.");
        }

        if (active) {
          setApplication(data.application);
          setMembershipStatus(data.membership_status);
        }
      } catch (statusError) {
        if (active) setError(statusError.message || "Unable to load application status.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const details = application ? statusDetails[application.status] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-8">
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl sm:p-10">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:underline"
        >
          <ArrowLeft size={17} />
          Back to ArtSpace
        </Link>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-800">
          <ClipboardCheck size={28} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-green-700">Membership</p>
        <h1 className="mt-1 text-3xl font-bold text-green-950">Application status</h1>

        {loading ? (
          <p className="mt-6 text-sm text-gray-600">Loading your application...</p>
        ) : error ? (
          <div className="mt-6">
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
            {!localStorage.getItem("token") && (
              <Link to="/login" className="mt-4 inline-block font-semibold text-green-800 hover:underline">
                Log in
              </Link>
            )}
          </div>
        ) : details ? (
          <div className={`mt-6 rounded-2xl p-5 ${details.style}`}>
            <h2 className="text-lg font-bold">{details.title}</h2>
            <p className="mt-2 text-sm leading-6">{details.description}</p>
            {application.status === "REJECTED" && application.rejection_reason && (
              <p className="mt-3 text-sm"><span className="font-semibold">Reason:</span> {application.rejection_reason}</p>
            )}
            {application.submitted_at && (
              <p className="mt-3 text-xs opacity-75">
                Submitted {new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(application.submitted_at))}
              </p>
            )}
            {application.status === "REJECTED" && (
              <Link
                to="/applyformembership"
                className="mt-4 inline-flex rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
              >
                Submit another application
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-gray-50 p-5 text-gray-700">
            <h2 className="font-semibold">No application submitted</h2>
            <p className="mt-2 text-sm leading-6">
              {membershipStatus === "MEMBER"
                ? "Your ArtSpace membership is active."
                : "Submit a referral code to apply for ArtSpace membership."}
            </p>
            {membershipStatus !== "MEMBER" && (
              <Link
                to="/applyformembership"
                className="mt-4 inline-flex rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
              >
                Apply for membership
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
