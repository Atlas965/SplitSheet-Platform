import { useState } from "react";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User, insertUserSchema, TERRITORIES, type RightsOrganization, type CreatorRightsProfile } from "@shared/schema";
import { Camera, User as UserIcon, Mail, Phone, MapPin, Globe, Plus, X, Download, ShieldAlert, Trash2, Landmark } from "lucide-react";
import { activityTracker } from "@/lib/activityTracker";

const TERRITORY_LABELS: Record<string, string> = {
  CA: "Canada",
  US: "United States",
  UK: "United Kingdom",
  EU: "European Union",
  AU: "Australia",
  OTHER: "Other / International",
};

const rightsProfileSchema = z.object({
  ipiNumber: z.string().optional(),
  proAffiliation: z.string().optional(),
  territory: z.enum(TERRITORIES).default("CA"),
  songwriterStatus: z.boolean().default(false),
  publisherStatus: z.boolean().default(false),
});
type RightsProfileFormData = z.infer<typeof rightsProfileSchema>;

const profileSchema = insertUserSchema.omit({
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  subscriptionTier: true,
  role: true,
  isActive: true,
}).extend({
  skills: z.array(z.string()).default([]),
  contactInfo: z.object({
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const [newSkill, setNewSkill] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");

  // Track page view
  React.useEffect(() => {
    activityTracker.trackPageView('profile');
  }, []);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // ─── Rights & PRO Profile (Global Rights Framework — Settings → Rights Profile) ───
  const { data: rightsProfile, isLoading: isRightsProfileLoading } = useQuery<CreatorRightsProfile | null>({
    queryKey: ["/api/rights-profile"],
  });

  const rightsForm = useForm<RightsProfileFormData>({
    resolver: zodResolver(rightsProfileSchema),
    defaultValues: {
      ipiNumber: "",
      proAffiliation: "",
      territory: "CA",
      songwriterStatus: false,
      publisherStatus: false,
    },
  });

  const rightsTerritory = rightsForm.watch("territory");

  const { data: rightsOrganizations = [] } = useQuery<RightsOrganization[]>({
    queryKey: ["/api/rights-organizations", { territory: rightsTerritory }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rights-organizations?territory=${rightsTerritory}`);
      return res.json();
    },
  });

  React.useEffect(() => {
    if (rightsProfile) {
      rightsForm.reset({
        ipiNumber: rightsProfile.ipiNumber || "",
        proAffiliation: rightsProfile.proAffiliation || "",
        territory: (rightsProfile.territory as any) || "CA",
        songwriterStatus: rightsProfile.songwriterStatus ?? false,
        publisherStatus: rightsProfile.publisherStatus ?? false,
      });
    }
  }, [rightsProfile, rightsForm]);

  const updateRightsProfileMutation = useMutation({
    mutationFn: (data: RightsProfileFormData) => apiRequest("PUT", "/api/rights-profile", data),
    onSuccess: () => {
      toast({ title: "Rights Profile Updated", description: "Your PRO affiliation and rights settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/rights-profile"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update rights profile. Please try again.", variant: "destructive" });
    },
  });

  const onSubmitRightsProfile = (data: RightsProfileFormData) => {
    updateRightsProfileMutation.mutate(data);
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      bio: "",
      skills: [],
      contactInfo: { phone: "", location: "", website: "" },
    },
  });

  // Reset form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        bio: user.bio || "",
        skills: user.skills || [],
        contactInfo: user.contactInfo || { phone: "", location: "", website: "" },
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Only send fields that have values (don't send empty strings that could overwrite data)
      const cleanData: Partial<ProfileFormData> = {};
      
      if (data.firstName) cleanData.firstName = data.firstName;
      if (data.lastName) cleanData.lastName = data.lastName;
      if (data.email) cleanData.email = data.email;
      if (data.bio !== undefined) cleanData.bio = data.bio; // Allow empty bio
      if (data.skills && data.skills.length > 0) cleanData.skills = data.skills;
      if (data.contactInfo) cleanData.contactInfo = data.contactInfo;
      
      return apiRequest("/api/profile", "PATCH", cleanData);
    },
    onSuccess: () => {
      activityTracker.trackProfileAction('profile_updated', { fieldsUpdated: Object.keys(form.getValues()) });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      activityTracker.trackError('profile_update_failed', 'profile_form');
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadProfileImageMutation = useMutation({
    mutationFn: (imageUrl: string) =>
      apiRequest("/api/profile/image", "PUT", { profileImageUrl: imageUrl }),
    onSuccess: () => {
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      uploadProfileImageMutation.mutate(uploadedFile.uploadURL);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest("GET", "/api/user/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `splitsheet-data-export-${user?.id ?? "me"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export Ready", description: "Your data export has been downloaded." });
    } catch {
      toast({ title: "Export Failed", description: "Could not generate your data export. Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const resetWorkspaceMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/account/reset-workspace", { confirm: "RESET" }),
    onSuccess: async () => {
      toast({
        title: "Workspace reset",
        description: "Your projects, clients, and notifications were cleared. You are on Starter (free).",
      });
      setShowResetDialog(false);
      setResetConfirm("");
      await queryClient.invalidateQueries();
    },
    onError: (err: Error) => {
      toast({
        title: "Reset failed",
        description: err.message || "Could not reset this workspace.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/account/delete", { confirm: true }),
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Your account has been deactivated. You will now be signed out." });
      setShowDeleteDialog(false);
      setTimeout(() => { window.location.href = "/api/logout"; }, 1200);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete account. Please try again.", variant: "destructive" });
    },
  });

  const addSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = form.getValues("skills") || [];
      form.setValue("skills", [...currentSkills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const currentSkills = form.getValues("skills") || [];
    form.setValue("skills", currentSkills.filter(skill => skill !== skillToRemove));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const skills = form.watch("skills") || [];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your profile information and preferences
          </p>
        </div>

        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage 
                src={user?.profileImageUrl || ""} 
                alt={`${user?.firstName} ${user?.lastName}`} 
              />
              <AvatarFallback className="text-2xl">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={5242880} // 5MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-fit"
            >
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Upload New Photo
              </div>
            </ObjectUploader>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" disabled data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Tell us about yourself..."
                          className="min-h-[100px]"
                          data-testid="textarea-bio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Skills Section */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Skills</Label>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill..."
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      data-testid="input-skill"
                    />
                    <Button type="button" onClick={addSkill} size="sm" data-testid="button-add-skill">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                          data-testid={`button-remove-skill-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Contact Information</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactInfo.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1 (555) 123-4567" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactInfo.location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City, Country" data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactInfo.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://yourwebsite.com" data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Rights & PRO Profile — Global Rights Framework */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Rights & PRO Profile
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell SplitSheet how you're registered so agreements, licensing checks, and royalty
              reporting reflect your real-world rights organization and territory.
            </p>
          </CardHeader>
          <CardContent>
            {isRightsProfileLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <Form {...rightsForm}>
                <form onSubmit={rightsForm.handleSubmit(onSubmitRightsProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={rightsForm.control}
                      name="territory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Territory</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-rights-territory">
                                <SelectValue placeholder="Select territory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TERRITORIES.map((t) => (
                                <SelectItem key={t} value={t}>{TERRITORY_LABELS[t] ?? t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={rightsForm.control}
                      name="proAffiliation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PRO / Rights Organization</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-rights-pro">
                                <SelectValue placeholder="Select your PRO" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rightsOrganizations.map((org) => (
                                <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>
                              ))}
                              {rightsOrganizations.length === 0 && (
                                <SelectItem value="None" disabled>No organizations for this territory</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={rightsForm.control}
                    name="ipiNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IPI / CAE Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00 123 456 789" data-testid="input-rights-ipi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={rightsForm.control}
                      name="songwriterStatus"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="text-sm font-medium">Songwriter</FormLabel>
                            <p className="text-xs text-muted-foreground">I write or co-write compositions</p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-songwriter-status" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={rightsForm.control}
                      name="publisherStatus"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="text-sm font-medium">Publisher</FormLabel>
                            <p className="text-xs text-muted-foreground">I administer publishing rights</p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-publisher-status" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={updateRightsProfileMutation.isPending}
                      data-testid="button-save-rights-profile"
                    >
                      {updateRightsProfileMutation.isPending ? "Saving..." : "Save Rights Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Privacy & Data — PIPEDA / GDPR-equivalent controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border">
              <div>
                <p className="font-medium">Download my data</p>
                <p className="text-sm text-muted-foreground">
                  Get a copy of every record we hold about you — profile, contracts, ownership, payouts, and activity — as a JSON file.
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData} disabled={isExporting} data-testid="button-export-data">
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Preparing..." : "Export My Data"}
              </Button>
            </div>

            <ReferralCard />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border">
              <div>
                <p className="font-medium">Reset workspace to Starter</p>
                <p className="text-sm text-muted-foreground">
                  Clears only your projects, roster clients, and notifications, then returns this account to the free plan. Other operators are not affected. Type RESET to confirm.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowResetDialog(true)} data-testid="button-reset-workspace">
                Reset workspace
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium text-destructive">Delete my account</p>
                <p className="text-sm text-muted-foreground">
                  Anonymizes your personal information and deactivates your account. Financial/legal records required for royalty
                  accounting are retained in anonymized form, as required by law.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} data-testid="button-delete-account">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={showResetDialog}
        onOpenChange={(open) => {
          setShowResetDialog(open);
          if (!open) setResetConfirm("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your projects, confirmation links, roster clients, and notifications, then sets billing to Starter. Your login stays. Other accounts are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Type RESET to continue</Label>
            <Input
              id="reset-confirm"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              autoComplete="off"
              data-testid="input-reset-confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetConfirm !== "RESET" || resetWorkspaceMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                resetWorkspaceMutation.mutate();
              }}
              data-testid="button-confirm-reset-workspace"
            >
              {resetWorkspaceMutation.isPending ? "Resetting…" : "Reset to Starter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will anonymize your profile (name, email, bio, photo) and deactivate your account immediately.
              Signed contracts and payout ledgers tied to you are retained in anonymized form for legal/financial
              record-keeping. This action cannot be undone from within the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-account">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReferralCard() {
  const { data } = useQuery<{ code: string; link: string; stats: Record<string, number> }>({
    queryKey: ["/api/referrals"],
  });
  if (!data) return null;
  return (
    <div className="p-4 rounded-lg border space-y-2">
      <p className="font-medium">Refer another studio</p>
      <p className="text-sm text-muted-foreground">Share this link. Attribution is recorded server-side. No discounts are applied yet.</p>
      <p className="text-sm font-mono break-all">{data.link}</p>
      <p className="text-xs text-muted-foreground">
        Pending {data.stats.pending ?? 0} · Signed up {data.stats.signedUp ?? 0} · Converted {data.stats.converted ?? 0}
      </p>
    </div>
  );
}