'use client';

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { AuthApiError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type AuthMode = "sign-in" | "sign-up";

const INITIAL_MESSAGE =
  "Halo requires a verified email before you can join a circle. Sign in with your password or create an account below.";

export default function AuthPanel() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(INITIAL_MESSAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const resetFeedback = () => {
    setMessage(INITIAL_MESSAGE);
    setShowConfirmation(false);
  };

  const toggleMode = () => {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setUsername("");
    setPassword("");
    resetFeedback();
  };

  const getRedirectUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl =
      typeof siteUrl === "string" && siteUrl.length > 0
        ? siteUrl.replace(/\/+$/, "")
        : window.location.origin;
    return `${baseUrl}/auth/callback`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail) {
        throw new Error("Email is required.");
      }

      if (!trimmedPassword) {
        throw new Error("Password is required.");
      }

      if (mode === "sign-up") {
        if (!trimmedUsername) {
          throw new Error("Display name is required for sign up.");
        }

        if (trimmedPassword.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        const redirectTo = getRedirectUrl();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: { username: trimmedUsername },
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          if (error instanceof AuthApiError && error.status === 400) {
            setMode("sign-in");
            setPassword("");
            setMessage("An account already exists for this email. Try signing in instead.");
            setShowConfirmation(false);
            return;
          }
          throw error;
        }

        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMode("sign-in");
          setPassword("");
          setMessage("An account already exists for this email. Try signing in instead.");
          setShowConfirmation(false);
          return;
        }

        setMode("sign-in");
        setPassword("");
        setShowConfirmation(true);
        setMessage(
          "Check your inbox to verify your email. Once confirmed, we will sign you in automatically."
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        setMessage("Please verify your email before signing in.");
        setShowConfirmation(false);
        return;
      }

      setMessage("Welcome back! Redirecting you to Halo...");
      setShowConfirmation(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      const unknownError = error instanceof Error ? error.message : "Unexpected error.";
      setMessage(unknownError);
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordPlaceholder = mode === "sign-up" ? "Minimum 8 characters" : "Password";
  const isInvalidCredentials =
    typeof message === "string" && message.trim().toLowerCase() === "invalid login credentials";
  const messageClassName = isInvalidCredentials
    ? "mt-4 text-sm rounded-xl bg-rose-100/70 px-3 py-2 text-rose-600"
    : "mt-4 text-sm text-slate-600";

  return (
    <section className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-lg backdrop-blur">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">
          {mode === "sign-up" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "sign-up"
            ? "Verified emails unlock your private status circles."
            : "Sign in with your verified email and password."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="you@example.com"
          />
        </div>

        {mode === "sign-up" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="username">
              Display name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="halo-friend"
              required
              autoComplete="nickname"
            />
            <p className="text-xs text-slate-400">This name is visible to your circles.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder={passwordPlaceholder}
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSubmitting ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </form>

      {message && <p className={messageClassName}>{message}</p>}

      {showConfirmation && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          We sent a verification email to <span className="font-medium">{email}</span>. Follow the link to
          confirm your account and we will drop you right into Halo.
        </div>
      )}

      <div className="mt-6 text-center text-sm text-slate-500">
        {mode === "sign-up" ? (
          <>
            Already have an account?
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-slate-900 underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New to Halo?
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-slate-900 underline-offset-4 hover:underline"
            >
              Create an account
            </button>
          </>
        )}
      </div>
    </section>
  );
}
