"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignUp afterSignUpUrl="/queue" appearance={{ layout: { socialButtonsVariant: "blockButton" } }} />
    </div>
  );
}
