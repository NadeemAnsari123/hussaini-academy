
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationStatus = searchParams.get("registered");

  const isSignupSuccess = registrationStatus === "success";
  const needsEmailVerification =
    registrationStatus === "verify-email";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    const formData = new FormData(e.currentTarget);

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    setError("");
    setLoading(true);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        if (
          authError.message.toLowerCase().includes("email not confirmed")
        ) {
          setError(
            "Please verify your email address before signing in. Check your inbox for the confirmation link."
          );
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!data.session) {
        setError("Unable to sign in. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the login service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#061711] via-[#104B37] to-[#071D18] px-4 py-12 text-white">
      {/* Gradient effects */}
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        {/* Left panel */}
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
              Begin Your Journey
              <span className="block text-amber-300">
                of Knowledge.
              </span>
            </h1>

            <p className="mt-6 leading-8 text-white/65">
              Explore Quranic learning, Islamic education,
              and meaningful lessons designed to help
              you grow in knowledge and faith.
            </p>
          </div>

          <p className="text-sm text-white/50">
            Knowledge • Character • Faith
          </p>
        </div>

        {/* Login form */}
        <div className="bg-white/[0.07] p-7 sm:p-12">
          <Link
            href="/"
            className="mb-10 inline-block text-sm text-amber-200 hover:text-white"
          >
            ← Back to Home
          </Link>

          {/* Signup success message */}
          {isSignupSuccess && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-sm text-emerald-100"
            >
              <p className="font-bold">
                ✓ Registration Successful!
              </p>
              <p className="mt-1 text-emerald-100/80">
                Your account has been created. You can now
                sign in with your email and password.
              </p>
            </div>
          )}

          {/* Email verification message */}
          {needsEmailVerification && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-4 text-sm text-emerald-100"
            >
              <p className="font-bold">
                ✓ Registration Request Successful!
              </p>
              <p className="mt-1 text-emerald-100/80">
                Please check your inbox and verify your
                email address before signing in.
              </p>
            </div>
          )}

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Student Portal
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Welcome Back
          </h2>

          <p className="mt-3 text-sm text-white/60">
            Sign in to continue your learning journey.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-9 space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
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
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none transition placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 pr-20 text-white outline-none transition placeholder:text-white/35 focus:border-amber-300 disabled:opacity-60"
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

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#E8C778] to-[#C69A43] px-5 py-4 font-bold text-[#10291E] shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#10291E]/30 border-t-[#10291E]" />
                  Signing In...
                </>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            New to Hussaini Academy?{" "}
            <Link
              href="/signup"
              className="font-semibold text-amber-300 hover:underline"
            >
              Create Account
            </Link>
          </p>

          <p className="mt-10 text-center text-xs text-white/40">
            © 2026 Hussaini Academy
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#061711] text-amber-200">
          Loading login page...
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
