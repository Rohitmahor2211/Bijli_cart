import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { clearBuyerTokens, setBuyerTokens } from '../api/axios';
import { useToast } from '../components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  async function sendOtp(e) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) { showToast('Please enter a valid 10-digit mobile number.', 'error'); return; }
    try { await api.post('/buyer-auth/login/send-otp', { phone: `+91${mobile.trim()}` }); setOtpSent(true); showToast('OTP sent successfully.', 'success'); }
    catch (error) {
      if (error.response?.status === 404) {
        showToast('No account found for this mobile number. Create an account to continue.', 'info');
        navigate('/signup');
      } else showToast(error.response?.data?.message || 'Unable to send OTP.', 'error');
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    try { const response = await api.post('/buyer-auth/verify-otp', { phone: `+91${mobile.trim()}`, otp }); const data = response.data?.data; const buyer = data?.buyer; setBuyerTokens(data); localStorage.setItem('bijlikartCustomerAuth', 'true'); localStorage.setItem('bijlikartCustomerName', buyer?.name || 'Customer'); navigate('/'); }
    catch (error) { showToast(error.response?.data?.message || 'Invalid OTP. Please try again.', 'error'); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-3xl font-black text-[#071b3d]">⚡ BIJLICART</div>
          <p className="text-xs text-gray-400 mt-1">Electronics Marketplace</p>
        </div>

        {!otpSent ? (
          <>
            <h1 className="text-2xl font-black text-gray-800 mb-1">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-6">Login securely with your registered mobile number.</p>

            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-gray-600">🇮🇳 +91</span>
                  <input type="tel" inputMode="numeric" maxLength={10} value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition" />
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <strong className="text-xs text-blue-900 block">Secure OTP Login</strong>
                  <p className="text-xs text-gray-500 mt-0.5">Only registered customers can login via OTP.</p>
                </div>
              </div>
              <button type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-200">
                Send OTP →
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">New to Avnish?</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <button onClick={() => navigate('/signup')}
              className="w-full py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
              Create New Account
            </button>

            <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div>
                <strong className="text-sm text-gray-700 block">🏪 Are you a seller?</strong>
                <p className="text-xs text-gray-400 mt-0.5">Use dedicated seller login</p>
              </div>
              <button onClick={() => navigate('/seller-login')}
                className="text-sm font-bold text-blue-600 hover:underline">Seller Login →</button>
            </div>
          </>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📱</div>
              <h2 className="text-xl font-black text-gray-800">Verify OTP</h2>
              <p className="text-sm text-gray-500 mt-1">OTP sent to <strong className="text-blue-600">+91 {mobile}</strong></p>
            </div>
            <input type="text" inputMode="numeric" maxLength={6} autoFocus value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              className="w-full border-2 border-blue-200 rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[10px] focus:border-blue-500 transition" />
            <button type="submit"
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-black rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg">
              ✓ Verify OTP & Login
            </button>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }}
              className="w-full py-2 text-blue-600 font-bold text-sm hover:underline">
              ← Change mobile number
            </button>
          </form>
        )}

        <button onClick={() => navigate('/')} className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 text-center transition">
          ← Back to BijliCart
        </button>
      </div>
    </div>
  );
}
