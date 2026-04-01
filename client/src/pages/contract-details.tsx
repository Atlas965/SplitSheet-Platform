import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { downloadContractPDF } from "@/lib/pdfGenerator";
import Logo from "@/components/Logo";
import SignatureCanvas, { type SignaturePayload } from "@/components/SignatureCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, RotateCcw, Shield, Gavel, Clock, User, Mail, PenLine, Users } from "lucide-react";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function ContractDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savedSignature, setSavedSignature] = useState<SignaturePayload | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: contract, isLoading: contractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", id],
    enabled: !!id && isAuthenticated,
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest("PATCH", `/api/contracts/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Contract status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update contract status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/contracts/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Contract Deleted",
        description: "The contract has been permanently removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setLocation("/contracts");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const eSignMutation = useMutation({
    mutationFn: async (payload: SignaturePayload) => {
      return await apiRequest("POST", `/api/contracts/${id}/sign`, payload);
    },
    onSuccess: (_data, payload) => {
      setSavedSignature(payload);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Contract Signed",
        description: `Signed by ${payload.signerName}. Your signature certificate has been saved.`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Signing Failed",
        description: "Could not save your signature. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Signed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadPDF = async () => {
    if (!contract) return;
    
    try {
      downloadContractPDF({
        title: contract.title,
        type: contract.type,
        data: contract.data,
        createdAt: contract.createdAt
      });
      
      toast({
        title: "PDF Downloaded",
        description: "Contract PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    // For now, just copy the contract link to clipboard
    const contractUrl = `${window.location.origin}/contracts/${id}`;
    navigator.clipboard.writeText(contractUrl);
    setShowShareDialog(false);
    setShareEmail("");
    toast({
      title: "Link Copied",
      description: "Contract link has been copied to clipboard.",
    });
  };

  const renderContractContent = () => {
    if (!contract?.data) return null;

    switch (contract.type) {
      case 'split-sheet':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Song Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Song Title</Label>
                  <p className="text-muted-foreground">{contract.data.title || 'Not specified'}</p>
                </div>
                {contract.data.releaseDate && (
                  <div>
                    <Label className="font-semibold">Release Date</Label>
                    <p className="text-muted-foreground">{new Date(contract.data.releaseDate).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collaborators & Ownership</CardTitle>
              </CardHeader>
              <CardContent>
                {contract.data.collaborators && contract.data.collaborators.length > 0 ? (
                  <div className="space-y-3">
                    {contract.data.collaborators.map((collab: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{collab.name}</p>
                          <p className="text-sm text-muted-foreground">{collab.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{collab.ownershipPercentage}%</p>
                          <p className="text-sm text-muted-foreground">Ownership</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No collaborators specified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Royalty Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Performance Royalties</Label>
                  <p className="text-muted-foreground capitalize">{contract.data.performanceRoyalties || 'Equal'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Mechanical Royalties</Label>
                  <p className="text-muted-foreground capitalize">{contract.data.mechanicalRoyalties || 'Equal'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'performance':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-semibold">Event Title</Label>
                <p className="text-muted-foreground">{contract.data.title}</p>
              </div>
              <div>
                <Label className="font-semibold">Venue</Label>
                <p className="text-muted-foreground">{contract.data.venue}</p>
              </div>
              <div>
                <Label className="font-semibold">Event Date</Label>
                <p className="text-muted-foreground">{new Date(contract.data.eventDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="font-semibold">Performance Fee</Label>
                <p className="text-muted-foreground">${contract.data.performanceFee || 0}</p>
              </div>
              {contract.data.technicalRequirements && (
                <div>
                  <Label className="font-semibold">Technical Requirements</Label>
                  <p className="text-muted-foreground">{contract.data.technicalRequirements}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'producer':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Producer Agreement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-semibold">Track Title</Label>
                <p className="text-muted-foreground">{contract.data.title}</p>
              </div>
              <div>
                <Label className="font-semibold">Producer Name</Label>
                <p className="text-muted-foreground">{contract.data.producerName}</p>
              </div>
              <div>
                <Label className="font-semibold">Beat Price</Label>
                <p className="text-muted-foreground">${contract.data.beatPrice || 0}</p>
              </div>
              <div>
                <Label className="font-semibold">Royalty Percentage</Label>
                <p className="text-muted-foreground">{contract.data.royaltyPercentage || 0}%</p>
              </div>
              <div>
                <Label className="font-semibold">Credit Requirement</Label>
                <p className="text-muted-foreground">{contract.data.creditRequirement}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'management':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Management Agreement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-semibold">Agreement Title</Label>
                <p className="text-muted-foreground">{contract.data.title}</p>
              </div>
              <div>
                <Label className="font-semibold">Manager Name</Label>
                <p className="text-muted-foreground">{contract.data.managerName}</p>
              </div>
              <div>
                <Label className="font-semibold">Commission Rate</Label>
                <p className="text-muted-foreground">{contract.data.commissionRate || 0}%</p>
              </div>
              <div>
                <Label className="font-semibold">Contract Duration</Label>
                <p className="text-muted-foreground">{contract.data.contractDuration}</p>
              </div>
              <div>
                <Label className="font-semibold">Responsibilities</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{contract.data.responsibilities}</p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(contract.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (contractLoading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">SplitSheet</span>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Logo />
                <span className="text-xl font-bold text-primary">SplitSheet</span>
              </div>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Contract Not Found</h2>
            <p className="text-muted-foreground mb-4">The contract you're looking for doesn't exist or you don't have access to it.</p>
            <Link href="/contracts">
              <Button>Back to Contracts</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-xl font-bold text-primary">SplitSheet</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-muted-foreground hover:text-foreground">
                <i className="fas fa-bell"></i>
              </button>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-semibold">
                JD
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/contracts" className="text-muted-foreground hover:text-foreground">
                  Contracts
                </Link>
              </li>
              <li>
                <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
              </li>
              <li>
                <span className="text-foreground font-medium">{contract.title}</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Contract Header */}
        <div className="bg-card p-6 rounded-xl border border-border mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="contract-title">{contract.title}</h1>
              <div className="flex items-center space-x-4 text-muted-foreground">
                <span className="capitalize">{contract.type.replace('-', ' ')} Contract</span>
                <span>•</span>
                <span>Created {new Date(contract.createdAt).toLocaleDateString()}</span>
                {contract.updatedAt !== contract.createdAt && (
                  <>
                    <span>•</span>
                    <span>Updated {new Date(contract.updatedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(contract.status)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <i className="fas fa-download mr-2"></i>
              Download PDF
            </Button>
            
            <Link href={`/contracts/${id}/edit`}>
              <Button variant="outline" data-testid="button-edit-contract">
                <i className="fas fa-edit mr-2"></i>
                Edit
              </Button>
            </Link>

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-share-contract">
                  <i className="fas fa-share mr-2"></i>
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Contract</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shareEmail">Email Address</Label>
                    <Input
                      id="shareEmail"
                      type="email"
                      placeholder="colleague@example.com"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      data-testid="input-share-email"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleShare} data-testid="button-confirm-share">
                      Copy Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Select value={contract.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
              <SelectTrigger className="w-40" data-testid="select-contract-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteContractMutation.isPending}
              data-testid="button-delete-contract"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete Contract
            </Button>
          </div>
        </div>

        {/* E-Signature Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Content */}
            <div className="space-y-6">
              {renderContractContent()}

              {contract.data.additionalTerms && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{contract.data.additionalTerms}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-6">

            {/* ── SIGNERS ROSTER ─────────────────────────────── */}
            {(() => {
              const sigs: any[] = (contract.metadata as any)?.signatures || [];
              const hasSigs = sigs.length > 0 || savedSignature;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Signers
                      {hasSigs && (
                        <Badge className="ml-auto bg-green-100 text-green-700 text-xs">
                          {(sigs.length + (savedSignature && !sigs.find((s:any) => s.signedBy === 'current') ? 1 : 0))} signed
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Pending: contract owner (always first) */}
                    {!savedSignature && contract.status !== 'signed' && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">You (Contract Owner)</p>
                          <p className="text-xs text-muted-foreground">Signature required</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>
                      </div>
                    )}

                    {/* Completed signatures from metadata */}
                    {sigs.map((sig: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50" data-testid={`signer-row-${i}`}>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{sig.signerName}</p>
                          <p className="text-xs text-muted-foreground">{sig.signerEmail}{sig.signerTitle ? ` · ${sig.signerTitle}` : ""}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(sig.signedAt).toLocaleString()}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">Signed</Badge>
                      </div>
                    ))}

                    {/* Local signed state (before page refresh) */}
                    {savedSignature && !sigs.find((s:any) => s.signerEmail === savedSignature.signerEmail) && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{savedSignature.signerName}</p>
                          <p className="text-xs text-muted-foreground">{savedSignature.signerEmail}{savedSignature.signerTitle ? ` · ${savedSignature.signerTitle}` : ""}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(savedSignature.signedAt).toLocaleString()}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">Signed</Badge>
                      </div>
                    )}

                    {!hasSigs && contract.status !== 'signed' && (
                      <p className="text-xs text-muted-foreground text-center py-2">No signatures yet. Use the panel below to sign.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── SIGNATURE PANEL / CERTIFICATE ──────────────── */}
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  {(contract.status === 'signed' || savedSignature) ? "Signature Certificate" : "Sign This Contract"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">

                {/* ── CERTIFICATE (after signing) ── */}
                {(contract.status === 'signed' || savedSignature) ? (() => {
                  const meta = contract.metadata as any;
                  const sig = savedSignature || (meta?.signatures?.[0]) || null;
                  return (
                    <div className="space-y-4">
                      {/* Green banner */}
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-green-800">Contract Signed</p>
                          <p className="text-xs text-green-600">This document is legally binding under ESIGN & UETA Acts</p>
                        </div>
                      </div>

                      {/* Signature image */}
                      {(sig?.signatureData || meta?.ownerSignature) && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Signature</p>
                          <div className="border-2 border-border rounded-lg bg-white p-4 flex items-center justify-center" style={{ minHeight: "100px" }}>
                            <img
                              src={sig?.signatureData || meta?.ownerSignature}
                              alt="Saved signature"
                              className="max-h-20 max-w-full object-contain"
                              data-testid="img-saved-signature"
                            />
                          </div>
                        </div>
                      )}

                      {/* Certificate details */}
                      {sig && (
                        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 text-xs">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certificate of Signature</p>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-semibold">{sig.signerName}</span>
                            {sig.signerTitle && <span className="text-muted-foreground">· {sig.signerTitle}</span>}
                          </div>
                          {sig.signerEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{sig.signerEmail}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">
                              {new Date(sig.signedAt || meta?.signedAt).toLocaleString()}
                            </span>
                          </div>
                          {sig.mode && (
                            <div className="flex items-center gap-2">
                              <PenLine className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground capitalize">{sig.mode === "draw" ? "Hand-drawn" : "Typed"} signature</span>
                            </div>
                          )}
                          <Separator />
                          <p className="text-[10px] text-muted-foreground">
                            Document ID: <span className="font-mono">{contract.id}</span>
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSavedSignature(null)}
                        data-testid="button-resign-contract"
                      >
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                        Update / Re-Sign
                      </Button>
                    </div>
                  );
                })() : (
                  /* ── SIGNING CANVAS ── */
                  <SignatureCanvas
                    onSave={(payload) => eSignMutation.mutate(payload)}
                    isSaving={eSignMutation.isPending}
                  />
                )}

                {/* Legal footer */}
                <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> 256-bit SSL encrypted</p>
                  <p className="flex items-center gap-1.5"><Gavel className="h-3 w-3" /> Compliant: ESIGN Act & UETA</p>
                  <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Timestamp & IP logged</p>
                </div>
              </CardContent>
            </Card>

            {/* ── ACTIVITY TIMELINE ───────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">Contract Created</p>
                    <p className="text-muted-foreground">{new Date(contract.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {((contract.metadata as any)?.signatures || []).map((sig: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">Signed by {sig.signerName}</p>
                      <p className="text-muted-foreground">{sig.signerEmail} · {new Date(sig.signedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {savedSignature && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">Signed by {savedSignature.signerName} (you)</p>
                      <p className="text-muted-foreground">{savedSignature.signerEmail} · {new Date(savedSignature.signedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {contract.status !== 'signed' && !savedSignature && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-700">Awaiting Signatures</p>
                      <p className="text-muted-foreground">Contract pending signing</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}