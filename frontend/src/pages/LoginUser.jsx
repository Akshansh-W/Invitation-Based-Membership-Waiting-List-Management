import { useState } from "react";
import { Palette, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import backendUrl from "@/config/api.js";

export default function LoginUser({ adminLogin = false }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to log in.");
      }

      if (adminLogin && data.user.role !== "ADMIN") {
        localStorage.removeItem("token");
        throw new Error("This sign-in is for administrators only.");
      }

      localStorage.setItem("token", data.token);
      navigate(data.user.role === "ADMIN" ? "/admin/dashboard" : "/");
    } catch (error) {
      setError(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 via-white to-green-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        {/* Left introduction panel */}
        <section className="flex flex-col justify-between bg-green-800 p-8 text-white sm:p-10">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Palette size={27} />
            ArtSpace
          </Link>

          <div className="my-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200">Your creative journey</p>

            <h1 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl">Every artist has a story.</h1>

            <p className="max-w-sm leading-7 text-green-100">
              {adminLogin
                ? "Sign in with your administrator account to review membership applications and manage the ArtSpace community."
                : "Sign in to explore artwork, discover talented artists, and share your own creative perspective."}
            </p>
          </div>

          <p className="text-sm text-green-200">A community built around creativity.</p>
        </section>

        {/* Registration form */}
        <section className="p-6 sm:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-green-950">{adminLogin ? "Admin Login" : "Welcome back"}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {adminLogin ? "Sign in with your administrator credentials." : "Enter your email and password to sign in."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={19} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-green-200 py-3 pl-10 pr-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={19} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-green-200 py-3 pl-10 pr-12 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-800"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-800 py-3.5 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : adminLogin ? "Admin Login" : "Login"}
            </button>
          </form>

          {adminLogin ? (
            <p className="mt-6 text-center text-sm text-gray-600">
              <Link to="/login" className="font-semibold text-green-800 hover:underline">
                Member login
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-sm text-gray-600">
              New to ArtSpace?{" "}
              <Link to="/register" className="font-semibold text-green-800 hover:underline">
                Create an account
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
