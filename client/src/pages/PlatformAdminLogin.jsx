import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function PlatformAdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!otpSent) {
        await api.post("/platform-admin/login", { phone });
        setOtpSent(true);
      } else {
        const response = await api.post("/platform-admin/login/verify-otp", {
          phone,
          otp,
        });
        localStorage.setItem(
          "bijlikartPlatformAdminName",
          response.data.data.admin.name,
        );
        navigate("/platform-admin/sellers", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sign in.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl"
      >
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-2xl text-white">
            ⚡
          </div>
          <div>
            <p className="text-xs font-black tracking-[.18em] text-blue-600">
              BIJLICART
            </p>
            <p className="text-xs text-slate-400">Operations console</p>
          </div>
        </div>
        <h1 className="text-3xl font-black text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to manage sellers, orders and platform income.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}{" "}
        <label className="mt-6 block text-sm font-bold text-slate-700">
          Administrator phone
          <input
            required
            type="tel"
            value={phone}
            disabled={otpSent}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+919876543210"
            className="mt-1 w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {otpSent && (
          <label className="mt-4 block text-sm font-bold text-slate-700">
            OTP
            <input
              required
              inputMode="numeric"
              maxLength="6"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              className="mt-1 w-full rounded-xl border p-3 tracking-[.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        )}
        <button
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving
            ? otpSent
              ? "Verifying…"
              : "Sending OTP…"
            : otpSent
              ? "Verify OTP & sign in"
              : "Send OTP"}
        </button>
        {otpSent && (
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp("");
            }}
            className="mt-3 w-full text-sm font-bold text-slate-500"
          >
            Use a different phone number
          </button>
        )}
      </form>
    </main>
  );
}
