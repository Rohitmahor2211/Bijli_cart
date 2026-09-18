import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-md w-full">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You do not have permission to view this page. Please log in with an authorized account.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition"
          >
            Customer Login
          </button>
          <button
            onClick={() => navigate('/seller-login')}
            className="w-full bg-yellow-400 text-[#123b7a] font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition"
          >
            Seller Login
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-500 font-bold py-3 px-6 rounded-xl hover:bg-gray-100 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
