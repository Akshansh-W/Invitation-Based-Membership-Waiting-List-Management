import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import backendUrl from "@/config/api.js";

export default function AdminRoute({ children }) {
  const [access, setAccess] = useState("checking");

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (active) setAccess("denied");
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/auth/getUser`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 401) localStorage.removeItem("token");
          if (active) setAccess("denied");
          return;
        }

        const { user } = await response.json();
        if (active) setAccess(user.role === "ADMIN" ? "allowed" : "denied");
      } catch {
        if (active) setAccess("error");
      }
    };

    verifyAdmin();
    return () => {
      active = false;
    };
  }, []);

  if (access === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-green-50">
        <p className="text-sm font-medium text-green-800">Verifying administrator access...</p>
      </main>
    );
  }

  if (access === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  if (access === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-green-50 px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-gray-700">Unable to verify administrator access. Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return children;
}
