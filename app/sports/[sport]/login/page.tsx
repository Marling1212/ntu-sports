"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });

    if (error) {
      setError(error.message || "Sign in failed");
      setTimeout(() => setError(""), 5000);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ntu-gray">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ntu-green mb-4">Admin Login</h1>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-gray-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="your.email@ntu.edu.tw"
              required
              autoComplete="username"
              suppressHydrationWarning
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-700 mb-2">
              Password (for admin accounts)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:placeholder:text-gray-400"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={!email}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ntu-green text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send Login Link"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                const { error: err } = await supabase.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: `${window.location.origin}/admin/dashboard` },
                });
                if (err) {
                  setError(err.message);
                } else {
                  alert("We’ve sent a one‑time sign‑in link to your email.");
                }
                setLoading(false);
              }}
              disabled={loading || !email}
              className="w-full bg-white text-ntu-green py-3 rounded-lg font-semibold border-2 border-gray-300 hover:bg-ntu-green hover:text-white transition-colors"
            >
              {loading ? "Sending…" : "Send sign‑in link to my email"}
            </button>
            <p className="text-sm text-gray-500">We’ll email you a one‑time sign‑in link. No password required.</p>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don’t have an account? {" "}
            <Link href="/admin/signup" className="text-ntu-green hover:underline font-medium">
              Sign up
            </Link>
          </p>
          <Link href="/" className="text-sm text-gray-500 hover:underline mt-2 block">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
