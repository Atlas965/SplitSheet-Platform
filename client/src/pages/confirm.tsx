import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Music2, Clock, AlertCircle, Users, FileText,
} from "lucide-react";

interface ConfirmData {
  contributor: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    pro: string | null;
    ipi: string | null;
    ownershipPercentage: string;
    confirmedAt: string | null;
  };
  project: {
    id: string;
    title: string;
    songTitle: string;
    status: string;
  };
  allContributors: {
    id: string;
    name: string;
    role: string;
    ownershipPercentage: string;
    confirmedAt: string | null;
  }[];
}

export default function Confirm() {
  const { token } = useParams<{ token: string }>();
  const [agreed, setAgreed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading, isError } = useQuery<ConfirmData>({
    queryKey: ["/api/confirm", token],
    queryFn: () => fetch(`/api/confirm/${token}`).then(r => {
      if (!r.ok) throw new Error("Invalid link");
      return r.json();
    }),
    enabled: !!token,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: () => fetch(`/api/confirm/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => setConfirmed(true),
  });

  const alreadyConfirmed = !!data?.contributor.confirmedAt;
  const total = data?.allContributors.reduce((s, c) => s + parseFloat(c.ownershipPercentage), 0) ?? 0;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Link Not Found</h2>
          <p className="text-muted-foreground text-sm">
            This confirmation link is invalid or has expired. Please contact the person who sent it.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const { contributor, project, allContributors } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Logo />
          <div>
            <span className="font-bold text-foreground">SplitSheet</span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Split Sheet Confirmation</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Status banner */}
        {(confirmed || alreadyConfirmed) ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-14 w-14 mx-auto mb-4 text-green-600" />
              <h2 className="text-2xl font-bold text-green-900">You're confirmed!</h2>
              <p className="text-green-700 mt-2">
                Your agreement to this split sheet has been recorded.
                {alreadyConfirmed && contributor.confirmedAt && (
                  <span className="block text-sm mt-1 text-green-600">
                    Confirmed on {new Date(contributor.confirmedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">You've been asked to confirm a split sheet</p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    Review the ownership splits below and confirm your agreement at the bottom of this page.
                    No account required.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Music2 className="h-4 w-4" /> {project.songTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.title}</p>
          </CardContent>
        </Card>

        {/* Your stake */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Stake — {contributor.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-semibold capitalize">{contributor.role}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ownership</p>
                <p className="font-bold text-2xl text-primary">{parseFloat(contributor.ownershipPercentage).toFixed(2)}%</p>
              </div>
              {contributor.pro && (
                <div>
                  <p className="text-xs text-muted-foreground">PRO</p>
                  <p className="font-semibold">{contributor.pro}</p>
                </div>
              )}
              {contributor.ipi && (
                <div>
                  <p className="text-xs text-muted-foreground">IPI/CAE</p>
                  <p className="font-mono text-sm">{contributor.ipi}</p>
                </div>
              )}
            </div>
            <Progress value={parseFloat(contributor.ownershipPercentage)} className="h-3" />
          </CardContent>
        </Card>

        {/* All contributors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> All Contributors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allContributors.map(c => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${c.id === contributor.id ? "text-primary" : ""}`}>{c.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.role}</Badge>
                    {c.confirmedAt ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Confirmed
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
                      </Badge>
                    )}
                  </div>
                  <span className="font-bold">{parseFloat(c.ownershipPercentage).toFixed(2)}%</span>
                </div>
                <Progress value={parseFloat(c.ownershipPercentage)} className="h-1.5" />
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className={Math.abs(total - 100) < 0.01 ? "text-green-700" : "text-red-600"}>
                {total.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation action */}
        {!confirmed && !alreadyConfirmed && (
          <Card>
            <CardContent className="py-6 space-y-5">
              <div className="flex items-start gap-3">
                <Checkbox id="agree" checked={agreed} onCheckedChange={v => setAgreed(!!v)} data-testid="checkbox-agree" />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  I, <strong>{contributor.name}</strong>, confirm that I agree to the ownership split shown above for the song
                  "<strong>{project.songTitle}</strong>". I understand this is a binding acknowledgment of the described ownership percentages.
                </Label>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={!agreed || confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                data-testid="button-confirm-agreement"
              >
                {confirmMutation.isPending ? "Confirming…" : "I Confirm This Split Sheet"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your confirmation is time-stamped and stored securely. No account or login required.
              </p>
            </CardContent>
          </Card>
        )}

      </div>

      <footer className="text-center py-8 text-xs text-muted-foreground">
        Powered by <strong>SplitSheet</strong> · SoundLedger Technologies
      </footer>
    </div>
  );
}
