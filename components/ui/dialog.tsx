"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = DialogPrimitive.Overlay;
const DialogContent = DialogPrimitive.Content;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogOverlayImpl({ className, ...props }: DialogPrimitive.DialogOverlayProps) {
  return (
    <DialogOverlay
      className={cn(
        "fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

function DialogContentImpl({ className, children, ...props }: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlayImpl />
      <DialogContent
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-lg focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3 h-8 w-8 rounded-full p-0 text-slate-500 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogPrimitive.Close>
      </DialogContent>
    </DialogPortal>
  );
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-1.5 border-b border-slate-200 p-6", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end gap-2 border-t border-slate-200 p-6", className)} {...props} />
);

export {
  Dialog,
  DialogTrigger,
  DialogContentImpl as DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
};
