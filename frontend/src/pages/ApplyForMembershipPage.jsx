import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TicketCheck, ArrowRight, ArrowLeft } from "lucide-react";
import backendUrl from "@/config/api.js";

export default function ApplyForMembershipPage() {
  const [referralCode, setReferralCode] = useState("");
  const [profile, setProfile] = useState({
    designation: "",
    company: "",
    experience_years: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in before redeeming a referral code.");
      }

      const response = await fetch(`${backendUrl}/api/invitations/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          referralCode,
          designation: profile.designation,
          company: profile.company,
          experience_years: profile.experience_years,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to redeem referral code.");
      }

      navigate("/");
    } catch (error) {
      setError(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-8">
      <div className="relative flex min-h-[75vh] w-full max-w-4xl items-center justify-center rounded-3xl bg-white px-6 py-12 shadow-xl sm:px-12">
        <Link
          to="/"
          aria-label="Back to home"
          className="absolute left-5 top-5 rounded-full p-2 text-gray-500 transition hover:bg-green-100 hover:text-green-900"
        >
          <ArrowLeft size={22} />
        </Link>

        <div className="w-full max-w-lg">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-800">
            <TicketCheck size={32} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-700">ArtSpace Membership</p>

          <h1 className="mb-4 text-3xl font-bold text-green-950 sm:text-4xl">Become a member</h1>

          <p className="mb-8 leading-7 text-gray-600">
            Join our creative community to access member-only features. Enter your referral code to submit a membership application.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="referralCode" className="mb-2 block text-sm font-semibold text-gray-800">
              Referral code
            </label>

            <input
              id="referralCode"
              type="text"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value);
                setError("");
              }}
              placeholder="Enter your referral code"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-green-200 bg-green-50/50 px-4 py-3.5 outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="designation" className="mb-2 block text-sm font-semibold text-gray-800">
                  Designation <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="designation"
                  type="text"
                  maxLength={100}
                  value={profile.designation}
                  onChange={(event) => setProfile((current) => ({ ...current, designation: event.target.value }))}
                  className="w-full rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
              <div>
                <label htmlFor="company" className="mb-2 block text-sm font-semibold text-gray-800">
                  Company <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="company"
                  type="text"
                  maxLength={150}
                  value={profile.company}
                  onChange={(event) => setProfile((current) => ({ ...current, company: event.target.value }))}
                  className="w-full rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="experience_years" className="mb-2 block text-sm font-semibold text-gray-800">
                  Years of experience <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="80"
                  step="1"
                  value={profile.experience_years}
                  onChange={(event) => setProfile((current) => ({ ...current, experience_years: event.target.value }))}
                  className="w-full rounded-xl border border-green-200 bg-green-50/50 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-800 px-5 py-3.5 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Request"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-gray-500">
            Submitting a request does not grant membership automatically. Your application will be reviewed by an administrator.
          </p>
        </div>
      </div>
    </main>
  );
}
