import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Music, Users, Percent, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ConfirmPage() {
  const [, params] = useRoute("/confirm/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [requestChange, setRequestChange] = useState(false);
  const [notes, setNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/confirmations/${params?.token}`],
    enabled: !!params?.token,
  });

  const mutation = useMutation({
    mutationFn: async (status: "confirmed" | "requested_change") => {
      const res = await apiRequest("POST", `/api/confirmations/${params?.token}/submit`, {
        status,
        notes: status === "requested_change" ? notes : "",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your response has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/confirmations/${params?.token}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid or Expired Link</h1>
        <p className="text-muted-foreground mb-6">This confirmation link is no longer valid or has expired.</p>
        <Button onClick={() => setLocation("/")}>Go to Homepage</Button>
      </div>
    );
  }

  const { confirmation, contract, collaborator, allCollaborators } = data;

  if (confirmation.status !== "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Response Recorded</h1>
        <p className="text-muted-foreground mb-6">
          Thank you! Your {confirmation.status === "confirmed" ? "confirmation" : "change request"} has been sent to the project owner.
        </p>
        <Card className="w-full max-w-md text-left">
          <CardHeader>
            <CardTitle className="text-lg">{contract.title}</CardTitle>
            <CardDescription>Split Sheet Agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Role:</span>
              <span className="font-medium">{collaborator.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Share:</span>
              <span className="font-medium">{collaborator.ownershipPercentage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={confirmation.status === "confirmed" ? "default" : "outline"}>
                {confirmation.status === "confirmed" ? "Confirmed" : "Change Requested"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Review Split Sheet</h1>
          <p className="text-slate-500">Please review the ownership details for this track.</p>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Music className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Project Details</span>
            </div>
            <CardTitle className="text-2xl">{contract.title}</CardTitle>
            <CardDescription>Created by {contract.data?.ownerName || "Project Owner"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">Contributors</h3>
                </div>
                <Badge variant="secondary">{allCollaborators.length} Total</Badge>
              </div>
              <div className="space-y-3">
                {allCollaborators.map((col: any) => (
                  <div key={col.id} className={`flex items-center justify-between p-2 rounded-md ${col.id === collaborator.id ? 'bg-primary/5 border border-primary/10' : ''}`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {col.name} {col.id === collaborator.id && <span className="text-xs text-primary font-normal ml-1">(You)</span>}
                      </span>
                      <span className="text-xs text-slate-500">{col.role}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-medium text-slate-700">
                      <Percent className="h-3 w-3 text-slate-400" />
                      {col.ownershipPercentage}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {!requestChange ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox 
                    id="agree" 
                    checked={agreed} 
                    onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="agree"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I confirm that the ownership percentages listed above are correct.
                    </label>
                    <p className="text-xs text-muted-foreground">
                      By checking this, you agree to the split terms for this project.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    className="flex-1 h-12 text-base" 
                    disabled={!agreed || mutation.isPending}
                    onClick={() => mutation.mutate("confirmed")}
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Agreement
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 text-base"
                    onClick={() => setRequestChange(true)}
                    disabled={mutation.isPending}
                  >
                    Request Change
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">What needs to be changed?</label>
                  <Textarea 
                    placeholder="Describe the corrections needed..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1" 
                    variant="destructive"
                    disabled={!notes.trim() || mutation.isPending}
                    onClick={() => mutation.mutate("requested_change")}
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Request
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => setRequestChange(false)}
                    disabled={mutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-4 flex justify-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Powered by SplitSheet &bull; Secure Confirmation
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
