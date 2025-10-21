"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/queue";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-lg border bg-card p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Sign in to RoboQuill Outreach</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your @roboquill.io Google account
        </p>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Only @roboquill.io email addresses are allowed
      </p>
    </div>
  );
}
