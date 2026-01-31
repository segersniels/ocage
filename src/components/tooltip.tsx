import { ReactNode } from "react";

import { cn } from "../lib/utils";

export function Tooltip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("group relative", className)}>{children}</div>;
}

export function TooltipTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-xs text-gray-400 cursor-default rounded-full border border-gray-200 p-2 w-6 h-6 flex items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TooltipContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute cursor-default right-0 w-64 px-3 py-2 bg-neutral-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10",
        className
      )}
    >
      {children}
    </div>
  );
}
