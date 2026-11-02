
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    const form = e.currentTarget;
    const data = new FormData(form);

    const fullName = String(data.get("fullName") || "").trim();
    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") || "");
    const confirmPassword = String(
      data.get("confirmPassword") || ""
    );

    setError("");

    if (!fullName || !email) {
      setError("Please enter your full name and email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData.session) {
        router.replace("/login?registered=success");
      } else {
        router.replace("/login?registered=verify-email");
      }
    } catch {
      setError(
        "Unable to connect to the registration service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#061711] via-[#104B37] to-[#071D18] px-4 py-12 text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        {/* Left Branding Section */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#123D2B] to-[#071C16] p-12 md:flex">
          <Link
            href="/"
            className="text-2xl font-bold text-amber-300"
          >
            ☪ Hussaini Academy
          </Link>

          <div>
            <div className="mb-8 text-7xl text-amber-300">
              ☾
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              Your Journey
              <span className="block text-amber-300">
                Begins Here.
              </span>
            </h1>

            <p className="mt-6 leading-8 text-white/65">
              Join Hussaini Academy and begin exploring
              Quranic education, Tajweed, Arabic,
              Islamic Studies and meaningful learning.
            </p>

            <div className="mt-10 rounded-2xl border border-amber-300/20 bg-white/5 p-6">
              <p
                lang="ar"
                dir="rtl"
                className="text-center text-2xl text-amber-200"
              >
                وَقُل رَّبِّ زِدْنِي عِلْمًا
              </p>

              <p className="mt-4 text-center text-xs text-white/60">
                My Lord, increase me in knowledge.
                <br />
                Quran 20:114
              </p>
            </div>
          </div>

          <p className="text-sm text-white/50">
            Knowledge • Character • Faith
          </p>
        </div>

        {/* Right Registration Form */}
        <div className="bg-white/[0.07] p-7 sm:p-12">
          <Link
            href="/"
            className="mb-8 inline-block text-sm text-amber-200 hover:text-white"
          >
            ← Back to Home
          </Link>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Student Registration
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Create Account
          </h2>

          <p className="mt-3 text-sm text-white/60">
            Start your Islamic learning journey today.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm"
              >
                Full Name
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="student@example.com"
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 pr-20 text-white outline-none placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-200"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#E8C778] to-[#C69A43] px-5 py-4 font-bold text-[#10291E] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#10291E]/30 border-t-[#10291E]" />
                  Creating Account...
                </>
              ) : (
                "Create My Account →"
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-7 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-amber-300 hover:underline"
            >
              Sign In
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-white/40">
            © 2026 Hussaini Academy
          </p>
        </div>
      </div>
    </main>
  );
}
