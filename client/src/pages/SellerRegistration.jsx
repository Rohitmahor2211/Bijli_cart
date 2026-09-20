import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getApiErrorMessage } from "../utils/apiError";

const STEPS = [
  "Basic Details",
  "Business Info",
  "Bank Details",
  "Agreement",
  "Review",
];

export default function SellerRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    mainCategory: "Electronics",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
    confirmAccountNumber: "",
    deliveryPreference: "SELLER_DELIVERY",
    agreementAccepted: false,
    upiId: "",
  });

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  const normaliseIndianMobile = (value) => {
    const digits = String(value).replace(/\D/g, "");
    return digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits;
  };

  function validateStep() {
    const requiredByStep = [
      ["shopName", "ownerName", "phone", "email", "password"],
      [
        "address",
        "city",
        "state",
        "pincode",
        "panNumber",
        "mainCategory",
      ],
      [
        "accountHolderName",
        "accountNumber",
        "confirmAccountNumber",
        "ifscCode",
        "bankName",
        "branchName",
      ],
      ["agreementAccepted"],
    ];
    const missing = (requiredByStep[step] || []).find((field) => !form[field]);
    if (missing) {
      setError("Complete every required field before continuing.");
      return false;
    }
    if (
      step === 0 &&
      (!/^[6-9]\d{9}$/.test(normaliseIndianMobile(form.phone)) ||
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password))
    ) {
      setError(
        "Use a valid 10-digit Indian mobile number and a password with 8+ characters, uppercase, lowercase, and a number.",
      );
      return false;
    }
    if (
      step === 1 &&
      (!/^\d{6}$/.test(form.pincode) ||
        !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber.toUpperCase()))
    ) {
      setError("Enter a valid pincode and PAN. GST is optional but must be valid when provided.");
      return false;
    }
    if (
      step === 2 &&
      (!/^\d{9,18}$/.test(form.accountNumber) ||
        form.accountNumber !== form.confirmAccountNumber ||
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase()))
    ) {
      setError("Check the account numbers and IFSC code.");
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
    const payload = { ...form, phone: `+91${normaliseIndianMobile(form.phone)}` };
    await api.post("/auth/register", payload);
      setSuccess(true);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Registration failed. Please review the form details and try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">
            Registration Successful!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your seller account is under review. You'll be notified once
            approved.
          </p>
          <button
            onClick={() => navigate("/seller-login")}
            className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition"
          >
            Go to Seller Login →
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    // Step 0: Basic
    <div key="basic-details" className="space-y-4">
      <h2 className="text-xl font-black text-gray-800">Basic Details</h2>
      {[
        {
          label: "Shop Name",
          field: "shopName",
          type: "text",
          placeholder: "Your shop's name",
        },
        {
          label: "Owner Name",
          field: "ownerName",
          type: "text",
          placeholder: "Full name",
        },
        {
          label: "Phone",
          field: "phone",
          type: "tel",
          placeholder: "10-digit mobile",
        },
        {
          label: "Email",
          field: "email",
          type: "email",
          placeholder: "business@email.com",
        },
        {
          label: "Password",
          field: "password",
          type: "password",
          placeholder: "Min 8 characters",
        },
      ].map((f) => (
        <div key={f.field}>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            {f.label} <span className="text-red-500">*</span>
          </label>
          <input
            type={f.type}
            value={form[f.field]}
            onChange={(e) => set(f.field, e.target.value)}
            placeholder={f.placeholder}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition"
          />
        </div>
      ))}
    </div>,

    // Step 1: Business
    <div key="business-info" className="space-y-4">
      <h2 className="text-xl font-black text-gray-800">Business Info</h2>
      {[
        { label: "Address", field: "address", placeholder: "Shop address" },
        { label: "City", field: "city", placeholder: "City" },
        { label: "State", field: "state", placeholder: "State" },
        { label: "Pincode", field: "pincode", placeholder: "6-digit pincode" },
        {
          label: "GST Number",
          field: "gstNumber",
          placeholder: "GST registration number",
          optional: true,
        },
        {
          label: "PAN Number",
          field: "panNumber",
          placeholder: "Business PAN card number",
        },
      ].map((f) => (
        <div key={f.field}>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            {f.label} {!f.optional && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={form[f.field]}
            onChange={(e) => set(f.field, e.target.value)}
            placeholder={f.placeholder}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Delivery preference <span className="text-red-500">*</span>
        </label>
        <select
          value={form.deliveryPreference}
          onChange={(e) => set("deliveryPreference", e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition"
        >
          <option value="SELLER_DELIVERY">Seller-managed delivery</option>
          <option value="AVNISH_DELIVERY">BiljiKact delivery</option>
        </select>
      </div>
    </div>,

    // Step 2: Bank
    <div key="bank-details" className="space-y-4">
      <h2 className="text-xl font-black text-gray-800">Bank Details</h2>
      {[
        {
          label: "Account Holder Name",
          field: "accountHolderName",
          placeholder: "Name on bank account",
        },
        {
          label: "Account Number",
          field: "accountNumber",
          placeholder: "Bank account number",
        },
        {
          label: "IFSC Code",
          field: "ifscCode",
          placeholder: "Branch IFSC code",
        },
        {
          label: "Confirm Account Number",
          field: "confirmAccountNumber",
          placeholder: "Re-enter account number",
        },
        { label: "Bank Name", field: "bankName", placeholder: "Bank name" },
        {
          label: "Branch Name",
          field: "branchName",
          placeholder: "Branch name",
        },
        {
          label: "UPI ID",
          field: "upiId",
          placeholder: "seller@upi (optional)",
          optional: true,
        },
      ].map((f) => (
        <div key={f.field}>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            {f.label} {!f.optional && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={form[f.field]}
            onChange={(e) => set(f.field, e.target.value)}
            placeholder={f.placeholder}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition"
          />
        </div>
      ))}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        🔒 Bank details are encrypted and used only for payouts.
      </div>
    </div>,

    // Step 3: Agreement
    <div key="seller-agreement" className="space-y-4">
      <h2 className="text-xl font-black text-gray-800">Seller Agreement</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-48 overflow-y-auto text-xs text-gray-600 leading-relaxed">
        <p className="font-bold mb-2">BILJIKACT SELLER AGREEMENT</p>
        <p>
          By registering as a seller on BiljiKact Electronics Marketplace, you
          agree to: (1) Provide accurate product information; (2) Fulfill orders
          promptly; (3) Maintain product quality standards; (4) Comply with
          applicable laws and regulations; (5) Not engage in fraudulent
          activities; (6) Accept BiljiKact's commission structure as
          communicated; (7) Allow BiljiKact to display your products on the
          platform; (8) Maintain a minimum seller rating of 3.5/5.
        </p>
        <p className="mt-3">
          This agreement is subject to BiljiKact's Terms of Service and Privacy
          Policy. BiljiKact reserves the right to suspend or terminate seller
          accounts for violations of these terms.
        </p>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.agreementAccepted}
          onChange={(e) => set("agreementAccepted", e.target.checked)}
          className="mt-1 w-4 h-4 accent-blue-600"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the BijliKart Seller Agreement and Terms of
          Service.
        </span>
      </label>
    </div>,

    // Step 4: Review
    <div key="review-submit" className="space-y-4">
      <h2 className="text-xl font-black text-gray-800">Review & Submit</h2>
      <div className="space-y-3">
        {[
          { label: "Shop Name", value: form.shopName },
          { label: "Owner", value: form.ownerName },
          { label: "Phone", value: form.phone },
          { label: "Email", value: form.email },
          { label: "City", value: form.city },
          { label: "GST", value: form.gstNumber || "Not provided" },
          { label: "PAN", value: form.panNumber || "Not provided" },
          { label: "Bank", value: form.bankName || "Not provided" },
          { label: "UPI", value: form.upiId || "Not provided" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex justify-between py-2 border-b border-gray-100 text-sm"
          >
            <span className="text-gray-500 font-semibold">{item.label}</span>
            <span className="text-gray-800 font-bold">{item.value}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl font-black text-white">⚡ BijliKart</div>
          <p className="text-blue-200 text-sm mt-1">Seller Registration</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 scrollbar-none">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-yellow-400 text-[#123b7a]"
                      : "bg-white/20 text-white"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`ml-1 text-[10px] hidden sm:block ${i === step ? "text-yellow-400 font-bold" : "text-white/60"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-6 h-0.5 mx-1 ${i < step ? "bg-green-500" : "bg-white/20"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {error && step < STEPS.length - 1 && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {steps[step]}

          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition text-sm"
            >
              {step === 0 ? "← Home" : "← Back"}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => {
                  if (validateStep()) setStep(step + 1);
                }}
                className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition text-sm"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!form.agreementAccepted || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-black rounded-xl hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 text-sm"
              >
                {loading ? "Submitting..." : "✓ Submit Registration"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
