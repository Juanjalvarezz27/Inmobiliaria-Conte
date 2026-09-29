"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex-1 flex flex-col w-full animate-page-enter">
      {children}
    </div>
  );
}
