"use client";

import { cloneElement, isValidElement } from "react";
import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  children: React.ReactElement;
}

export function SignOutButton({ children }: SignOutButtonProps) {
  if (!isValidElement(children)) {
    throw new Error("SignOutButton expects a single React element as a child");
  }

  return cloneElement(children, {
    onClick: async (event: React.MouseEvent<HTMLButtonElement>) => {
      children.props?.onClick?.(event);
      event.preventDefault();
      await signOut({ callbackUrl: "/auth/sign-in" });
    }
  });
}
