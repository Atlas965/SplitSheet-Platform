import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

type Provider = {
  id: string;
  label: string;
  enabled: boolean;
  authPath: string;
};

const PROVIDER_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  auth0: {
    bg: "bg-slate-900 hover:bg-slate-800",
    text: "text-white",
    border: "border-slate-900",
    icon: "",
  },
  google: {
    bg: "bg-white hover:bg-slate-50",
    text: "text-slate-900",
    border: "border-slate-300",
    icon: "G",
  },
  apple: {
    bg: "bg-black hover:bg-zinc-900",
    text: "text-white",
    border: "border-black",
    icon: "",
  },
  github: {
    bg: "bg-[#24292f] hover:bg-[#1b1f23]",
    text: "text-white",
    border: "border-[#24292f]",
    icon: "",
  },
  microsoft: {
    bg: "bg-white hover:bg-slate-50",
    text: "text-slate-900",
    border: "border-slate-300",
    icon: "M",
  },
};

function ProviderIcon({ id }: { id: string }) {
  if (id === "auth0") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M21.98 7.448L19.62 0H4.347L2.02 7.448c-1.352 4.155.1 8.52 3.698 11.105L12 24l6.282-5.447c3.598-2.585 5.05-6.95 3.698-11.105zM12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
      </svg>
    );
  }
  if (id === "apple") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.365 1.43c0 1.14-.418 2.2-1.247 3.025-.9.9-2.01 1.42-3.13 1.33-.14-1.1.4-2.25 1.25-3.1.9-.9 2.2-1.48 3.13-1.55zM20.5 17.2c-.58 1.3-.86 1.88-1.61 3.03-.9 1.35-2.17 3.03-3.74 3.05-1.39.02-1.75-.9-3.64-.9-1.9 0-2.3.88-3.66.92-1.55.04-2.73-1.46-3.64-2.8-1.85-2.72-3.24-7.7-1.35-11.07.95-1.7 2.5-2.78 4.24-2.8 1.33-.03 2.58.9 3.64.9 1.04 0 2.66-1.11 4.48-.95.76.03 2.9.31 4.28 2.33-.11.07-2.55 1.49-2.52 4.44.03 3.52 3.09 4.69 3.12 4.7z" />
      </svg>
    );
  }
  if (id === "github") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.69.42.36.79 1.08.79 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5z" />
      </svg>
    );
  }
  if (id === "microsoft") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#00A4EF" d="M13 1h10v10H13z" />
        <path fill="#7FBA00" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    );
  }
  // Google
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [localDev, setLocalDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const error = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error") || "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    fetch("/api/auth/providers", { credentials: "include", signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            body?.message ||
              body?.error ||
              `Could not load sign-in options (${r.status})`,
          );
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        setLocalDev(Boolean(data.localDev));
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.name === "AbortError"
            ? "Sign-in options timed out. The API may still be starting — refresh in a moment."
            : err?.message || "Failed to load providers";
        setLoadError(msg);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const enabled = providers.filter((p) => p.enabled);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Sign in to SplitSheet</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Authenticate with Google, Apple, or another connected provider to access your rights workflow.
            </p>

            {(error || loadError) && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error || loadError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {loading && (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading sign-in options…</div>
              )}

              {!loading && enabled.length === 0 && (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">No social providers configured yet</p>
                  <p>
                    Add Google / Apple / GitHub / Microsoft credentials in Vercel, set{" "}
                    <code className="text-xs">AUTH_PROVIDER=social</code>, then redeploy.
                  </p>
                  {localDev && (
                    <a
                      href="/api/login?local=1"
                      className="inline-flex mt-2 text-accent hover:underline font-medium"
                    >
                      Continue with local operator login →
                    </a>
                  )}
                </div>
              )}

              {enabled.map((p) => {
                const style = PROVIDER_STYLES[p.id] || PROVIDER_STYLES.google;
                return (
                  <a
                    key={p.id}
                    href={p.authPath}
                    className={`flex items-center justify-center gap-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${style.bg} ${style.text} ${style.border}`}
                    data-testid={`btn-auth-${p.id}`}
                  >
                    <ProviderIcon id={p.id} />
                    {p.label}
                  </a>
                );
              })}
            </div>

            {localDev && enabled.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-5">
                Dev only:{" "}
                <a href="/api/login?local=1" className="text-accent hover:underline">
                  local operator login
                </a>
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
            By continuing you agree to SplitSheet’s Terms and Privacy Policy.
            SplitSheet is not a law firm and does not provide legal advice.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
