import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { BadgeCheck, Globe, Phone } from "lucide-react";

type Studio = {
  id: string;
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  verificationStatus?: string;
  badgeTier?: string;
  verifiedSessionCount?: number;
};

export default function StudioPublic() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery<Studio>({
    queryKey: ["/api/studio", id],
    queryFn: () => fetch(`/api/studio/${id}`).then((r) => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    }),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading studio…</div>;
  }
  if (isError || !data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Studio not found.</div>;
  }

  const verified = data.verificationStatus === "verified";

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-8 text-center">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="" className="w-16 h-16 rounded-full mx-auto object-cover mb-4" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center text-xl font-bold">{data.name[0]}</div>
        )}
        <h1 className="text-2xl font-bold">{data.name}</h1>
        {verified && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="h-4 w-4" /> Verified by SplitSheet
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
          Verification indicates that this studio has been reviewed by SplitSheet according to its verification process. It does not imply legal accreditation, licensing, or professional certification.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          {data.website && <p className="flex items-center justify-center gap-2"><Globe className="h-4 w-4" /><a className="underline" href={data.website} target="_blank" rel="noreferrer">{data.website}</a></p>}
          {data.phone && <p className="flex items-center justify-center gap-2"><Phone className="h-4 w-4" />{data.phone}</p>}
          {typeof data.verifiedSessionCount === "number" && (
            <p>{data.verifiedSessionCount} confirmed session{data.verifiedSessionCount === 1 ? "" : "s"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
