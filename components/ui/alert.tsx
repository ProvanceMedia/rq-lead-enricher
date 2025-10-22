"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "success";
};

const variants: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "border-slate-200 text-slate-700 bg-slate-50",
  destructive: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn("rounded-md border px-4 py-3 text-sm", variants[variant], className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";
