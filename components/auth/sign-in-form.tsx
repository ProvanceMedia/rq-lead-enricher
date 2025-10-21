"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const callbackUrl = searchParams?.get("callbackUrl") ?? "/queue";

  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl
    });

    setPending(false);

    if (result?.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Check your inbox for a magic sign-in link.");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-lg border bg-card p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Sign in to RoboQuill Outreach</h1>
        <p className="text-sm text-muted-foreground">
          Use your company email address or sign in with Google.
        </p>
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@roboquill.io"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending link...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send magic link
            </>
          )}
        </Button>
      </form>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      {message ? (
        <p className="text-center text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
