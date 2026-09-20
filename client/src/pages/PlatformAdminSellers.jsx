import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const tokenHeaders = () => ({});

export default function PlatformAdminSellers() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await api.get("/platform-admin/sellers", {
        headers: tokenHeaders(),
        params: { status },
      });
      setSellers(response.data?.data?.sellers || []);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/platform-admin/login", { replace: true });
      } else
        setError(
          requestError.response?.data?.message ||
            "Unable to load seller queue.",
        );
    }
  }, [navigate, status]);
  useEffect(() => {
    load();
  }, [load]);
  const decide = async (seller, decision) => {
    const reason =
      decision === "REJECTED"
        ? window.prompt("Enter the required rejection reason:")
        : "";
    if (decision === "REJECTED" && !reason?.trim()) return;
    if (
      !window.confirm(
        `${decision === "APPROVED" ? "Approve" : "Reject"} ${seller.shopName}?`,
      )
    )
      return;
    setSavingId(seller._id);
    try {
      await api.patch(
        `/platform-admin/sellers/${seller._id}/compliance`,
        { decision, reason },
        { headers: tokenHeaders() },
      );
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update seller status.",
      );
    } finally {
      setSavingId("");
    }
  };
  const logout = async () => {
    try {
      await api.post("/platform-admin/logout");
    } finally {
      localStorage.removeItem("bijlikartPlatformAdminName");
      navigate("/platform-admin/login", { replace: true });
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-blue-600">
              BILJIKACT OPERATIONS
            </p>
            <h1 className="text-3xl font-black text-slate-900">
              Seller compliance queue
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review registration data and documents before enabling seller
              access.
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            Sign out
          </button>
        </header>
        <div className="mb-5 flex gap-2 flex-wrap">
          {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${status === value ? "bg-blue-600 text-white" : "bg-white text-slate-600 shadow-sm"}`}
            >
              {value}
            </button>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="grid gap-5">
          {sellers.map((seller) => (
            <article
              key={seller._id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {seller.shopName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {seller.ownerName} · {seller.email} · {seller.phone}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {seller.address}, {seller.city}, {seller.state} –{" "}
                    {seller.pincode}
                  </p>
                </div>
                <span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  {seller.sellerStatus}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <p>
                  <strong>PAN:</strong> {seller.panNumber}
                </p>
                <p>
                  <strong>GST:</strong> {seller.gstNumber}
                </p>
                <p>
                  <strong>Bank:</strong> {seller.bankDetails?.bankName} ·{" "}
                  {seller.bankDetails?.accountNumber}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {seller.documents?.map((document) => (
                  <a
                    key={document._id || document.docType}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-blue-700"
                  >
                    View {document.docType}
                  </a>
                ))}
              </div>
              {status === "PENDING" && (
                <div className="mt-5 flex gap-3">
                  <button
                    disabled={savingId === seller._id}
                    onClick={() => decide(seller, "APPROVED")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    disabled={savingId === seller._id}
                    onClick={() => decide(seller, "REJECTED")}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
          {!sellers.length && (
            <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
              No {status.toLowerCase()} sellers found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
