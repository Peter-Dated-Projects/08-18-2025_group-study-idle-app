"use client";

import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

// Simple provider wrapper - Firebase Auth is handled in useAuth hook
export function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
