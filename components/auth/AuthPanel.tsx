'use client';

import Image from "next/image";
import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { AuthApiError } from "@supabase/supabase-js";

type AuthMode = "sign-in" | "sign-up";

const INITIAL_MESSAGE =
  "Halo requires a verified email before you can join a circle. Create your account or sign in below.";

export default function AuthPanel() {
  const supabase = useSupabaseClient();
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const toggleMode = () => {
    setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"));
    setMessage(INITIAL_MESSAGE);
    setUsername("");
    setPassword("");
    setShowConfirmation(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

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

      const redirectTo = `${window.location.origin}/auth/callback`;

      if (mode === "sign-up") {
        if (!trimmedUsername) {
          throw new Error("Username is required for sign up.");
        }

        if (trimmedPassword.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

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
            setMessage("An account already exists for this email. Switch to Sign in to continue.");
            setMode("sign-in");
            setShowConfirmation(false);
            return;
          }
          throw error;
        }

        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMessage("An account already exists for this email. Switch to Sign in to continue.");
          setMode("sign-in");
          setShowConfirmation(false);
          return;
        }

        setMessage(
          "Account created! Confirm the verification email we just sent, then sign in with your password."
        );
        setPassword("");
        setShowConfirmation(true);
        setMode("sign-in");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setMessage("Check your inbox to verify your email before signing in.");
        } else {
          setMessage("Welcome back! Redirecting you to Halo...");
        }
        setShowConfirmation(false);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-lg backdrop-blur">
        <div className="mb-6 flex justify-center">
          <Image
            src="/halo-logo.png"
            alt="Halo symbol"
            width={100}
            height={96}
            className="h-24 w-24"
            priority
          />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Sign {mode === "sign-up" ? "Up" : "In"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "sign-up"
              ? "Use your email, display name, and a secure password. Verified emails unlock the app."
              : "Enter your email and password. Verified emails unlock the app."}
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
                Username
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
              <p className="text-xs text-slate-400">
                Pick the name your circles will see inside Halo.
              </p>
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
              placeholder="Minimum 8 characters"
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

        <p className="mt-4 text-sm text-slate-500">{message}</p>

        {showConfirmation && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            We sent a confirmation email to <span className="font-medium">{email}</span>. Follow the link to verify, then switch to <strong>Sign in</strong> to enter your password.
          </div>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === "sign-up" ? (
            <>
              Already have a link?
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
      </div>
    </div>
  );
}
