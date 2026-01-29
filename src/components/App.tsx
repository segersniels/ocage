import { useEffect, useState } from "react";

import type { ProviderUsage } from "../providers";
import { ConnectPage } from "./ConnectPage";
import { Dashboard } from "./Dashboard";

function getPathSegments(): string[] {
  return window.location.pathname.split("/").filter(Boolean);
}

export function App() {
  const [providers, setProviders] = useState<ProviderUsage[] | null>(null);
  const [path, setPath] = useState(getPathSegments());

  useEffect(() => {
    const handlePopState = () => setPath(getPathSegments());
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/providers");
        const json = (await res.json()) as ProviderUsage[];
        setProviders(json);
      } catch {
        // Will retry
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (path[0] === "connect" && path[1]) {
    return <ConnectPage provider={path[1]} />;
  }

  if (!providers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return <Dashboard providers={providers} />;
}
