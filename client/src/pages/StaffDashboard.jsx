import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/platform-operations/overview")
      .then((response) => setOverview(response.data?.data || {}))
      .catch((requestError) => {
        if (
          requestError.response?.status === 401 ||
          requestError.response?.status === 403
        )
          navigate("/staff-login", { replace: true });
        else
          setError(
            requestError.response?.data?.message ||
              "Unable to load operations overview.",
          );
      });
  }, [navigate]);
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black text-slate-900">
          Operations dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Server-authorized platform operations.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pending sellers", overview?.pendingSellers],
            ["Pending products", overview?.pendingProducts],
            ["Orders", overview?.orders],
            ["Open tickets", overview?.openTickets],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
