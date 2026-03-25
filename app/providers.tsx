'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return <SessionProvider>{children}</SessionProvider>;
}
