"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Crumb = { href?: string; label: string };

const PageCrumbsContext = createContext<{
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
}>({
  crumbs: null,
  setCrumbs: () => {},
});

export function PageCrumbsProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <PageCrumbsContext.Provider value={value}>{children}</PageCrumbsContext.Provider>;
}

export function usePageCrumbs(crumbs: Crumb[] | null) {
  const { setCrumbs } = useContext(PageCrumbsContext);
  const serialized = crumbs ? JSON.stringify(crumbs) : "";
  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, setCrumbs]);
}

export function useResolvedCrumbs(fallback: Crumb[]) {
  const { crumbs } = useContext(PageCrumbsContext);
  return crumbs ?? fallback;
}
