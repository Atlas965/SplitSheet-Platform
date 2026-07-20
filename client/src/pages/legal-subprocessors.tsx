/**
 * /legal/subprocessors — public Sub-processor / DPA registry (Priority 1.3).
 * Lists vendors that process personal data on behalf of SoundLedger.
 * No auth required; also bypasses TermsGate so operators mid-acceptance
 * can still review it.
 */
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

interface SubprocessorRow {
  name: string;
  purpose: string;
  region: string;
  dpaUrl: string | null;
  addedAt: string | null;
}

export default function LegalSubprocessors() {
  const { data, isLoading, error } = useQuery<{ subprocessors: SubprocessorRow[] }>({
    queryKey: ["/api/legal/subprocessors"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo />
            <span className="text-xl font-bold text-primary">SplitSheet</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <h1 className="text-3xl font-bold text-foreground mb-2">Sub-processors</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          SoundLedger Technologies Inc. engages the following sub-processors to
          deliver SplitSheet. Each vendor processes personal data only as needed
          for the stated purpose, under a data processing agreement where applicable.
        </p>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <p className="text-destructive">Could not load the sub-processor list. Please try again later.</p>
        )}

        {data && (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 font-semibold">DPA</th>
                </tr>
              </thead>
              <tbody>
                {data.subprocessors.map((s) => (
                  <tr key={s.name} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.region}</td>
                    <td className="px-4 py-3">
                      {s.dpaUrl ? (
                        <a
                          href={s.dpaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          View DPA
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8">
          Last updated via the platform sub-processor registry. Questions:{" "}
          <a href="mailto:privacy@splitsheet.ca" className="underline">privacy@splitsheet.ca</a>
        </p>
      </main>

      <Footer />
    </div>
  );
}
