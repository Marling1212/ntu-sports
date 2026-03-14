import Link from "next/link";

export default function CaptainNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 max-w-md text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">連結無效或已過期</h1>
        <p className="text-gray-600 mb-6">
          此隊長連結無法使用。請向主辦單位索取正確連結，或確認連結已完整複製。
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-lg bg-ntu-green text-white font-medium hover:opacity-90"
        >
          返回首頁
        </Link>
      </div>
    </div>
  );
}
