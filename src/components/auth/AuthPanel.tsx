"use client";

import { useState, useCallback, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { AuthApiError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "sign-in" | "sign-up";

export const authSchema = (mode: "sign-in" | "sign-up") =>
  z.object({
    email: z.string().email("Invalid email address"),
    username:
      mode === "sign-up"
        ? z.string().min(2, "Display name required")
        : z.string().optional(),
    password:
      mode === "sign-up"
        ? z.string().min(8, "Password must be at least 8 characters")
        : z.string().min(1, "Password is required"),
  });

export type AuthFormValues = z.infer<ReturnType<typeof authSchema>>;
export default function AuthPanel() {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const schema = authSchema(mode);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", username: "", password: "" },
  });

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
    form.reset();
    setMessage(null);
    setShowConfirmation(false);
  }, [form]);

  const getRedirectUrl = useCallback(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl =
      typeof siteUrl === "string" && siteUrl.length > 0
        ? siteUrl.replace(/\/+$/, "")
        : window.location.origin;
    return `${baseUrl}/auth/callback`;
  }, []);

  const onSubmit = useCallback(
    async (values: z.infer<typeof schema>) => {
      startTransition(async () => {
        setMessage(null);
        setShowConfirmation(false);

        try {
          const { email, password } = values;
          const username = values.username?.trim();

          if (mode === "sign-up") {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { username },
                emailRedirectTo: getRedirectUrl(),
              },
            });

            if (error) {
              if (error instanceof AuthApiError && error.status === 400) {
                setMode("sign-in");
                setMessage("Account exists. Try signing in.");
                return;
              }
              throw error;
            }

            if (
              data?.user &&
              Array.isArray(data.user.identities) &&
              data.user.identities.length === 0
            ) {
              setMode("sign-in");
              setMessage("Account exists. Try signing in.");
              return;
            }

            setShowConfirmation(true);
            setMessage("Check your inbox to verify your email.");
            setMode("sign-in");
            form.reset({ email, username: "", password: "" });
            return;
          }

          // sign in
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (!data.session) {
            setMessage("Please verify your email before signing in.");
            return;
          }

          setMessage("Welcome back! Redirecting...");
          router.replace("/");
          router.refresh();
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Unexpected error occurred.";
          setMessage(msg);
        }
      });
    },
    [mode, supabase, getRedirectUrl, router, form]
  );

  return (
    <Card
      className={cn(
        "w-full max-w-sm border border-slate-200 bg-white shadow-lg backdrop-blur gap-2 p-4"
      )}
    >
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-normal text-[#0a1420]">
          {mode === "sign-up" ? "Create your account" : "Sign in"}
        </CardTitle>
        <p className=" text-sm text-slate-500">
          {mode === "sign-up"
            ? "Verified emails unlock your private status circles."
            : ""}
        </p>
      </CardHeader>

      <CardContent className={cn("px-2")}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-light">Email</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-slate-200 text-xs font-extralight text-[#0a1420]"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "sign-up" && (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-light">Display name</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-slate-200 text-xs font-extralight text-[#0a1420]"
                        type="text"
                        placeholder="halo-friend"
                        autoComplete="nickname"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-slate-400">
                      This name is visible to your circles.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-light">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        className="bg-slate-200 text-xs font-extralight text-[#0a1420]"
                        type={showPassword ? "text" : "password"} // 👈 dynamic type
                        placeholder={
                          mode === "sign-up"
                            ? "Minimum 8 characters"
                            : "Password"
                        }
                        autoComplete={
                          mode === "sign-up"
                            ? "new-password"
                            : "current-password"
                        }
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full mt-2 text-sm font-light text-[#0a1420] bg-[#D3EFCE] rounded-4xl"
              disabled={isPending || form.formState.isSubmitting}
            >
              {isPending
                ? "Working..."
                : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
            </Button>
          </form>
        </Form>

        {message && (
          <p className="mt-4 text-sm text-slate-600 text-center">{message}</p>
        )}

        {showConfirmation && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            We sent a verification email to{" "}
            <span className="font-medium">{form.getValues("email")}</span>.
            Follow the link to confirm your account and we will drop you right
            into Halo.
          </div>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === "sign-up" ? (
            <>
              Already have an account?
              <Button
                variant="link"
                className="ml-1 px-0 text-slate-900 text-xs"
                onClick={toggleMode}
                type="button"
              >
                Sign in
              </Button>
            </>
          ) : (
            <>
              New to Halo?
              <Button
                variant="link"
                className="ml-1 px-0 text-slate-900 text-xs"
                onClick={toggleMode}
                type="button"
              >
                Create an account
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
