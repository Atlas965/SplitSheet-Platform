import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Users, Activity, MessageSquare, Settings, Search, AlertTriangle, CheckCircle, XCircle,
  FileText, Plus, Pencil, Trash2, DollarSign, TrendingUp, Wallet, BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const TEMPLATE_TYPES = [
  { value: "split-sheet", label: "Split Sheet" },
  { value: "performance", label: "Performance Contract" },
  { value: "producer", label: "Producer Agreement" },
  { value: "management", label: "Management Contract" },
];

const PIE_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "$0.00";
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

interface AdminTemplate {
  id: string;
  name: string;
  type: string;
  description: string | null;
  template: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user is admin (server-side verification will be the authoritative check)
  const isAdmin = (user as any)?.role === 'admin';

  // Get analytics data for admin overview
  const { data: adminStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAdmin
  });

  // Get all users (admin only)
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin
  });

  // Get recent activity
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['/api/admin/activity'],
    enabled: isAdmin
  });

  // Get all templates (admin only, includes inactive)
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<AdminTemplate[]>({
    queryKey: ['/api/admin/templates'],
    enabled: isAdmin
  });

  // Get revenue analytics
  const { data: revenueAnalytics, isLoading: isLoadingRevenue } = useQuery<any>({
    queryKey: ['/api/admin/revenue-analytics'],
    enabled: isAdmin
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest('PATCH', `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User updated" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatCard = ({ title, value, description, icon: Icon, color = "blue" }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const filteredUsers = Array.isArray(users)
    ? users.filter((u: any) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          u.email?.toLowerCase().includes(q) ||
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q)
        );
      })
    : [];

  const UserManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Management</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
              data-testid="input-search-users"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage users and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u: any) => (
                  <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={u.profileImageUrl} />
                        <AvatarFallback>{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium" data-testid={`text-username-${u.id}`}>{u.firstName} {u.lastName}</div>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? "user"}
                        onValueChange={(value) => updateUserMutation.mutate({ id: u.id, updates: { role: value } })}
                      >
                        <SelectTrigger className="w-28 h-8" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {u.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.subscriptionTier}</Badge>
                    </TableCell>
                    <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid={`button-toggle-active-${u.id}`}>
                            {u.isActive ? "Suspend" : "Activate"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{u.isActive ? "Suspend" : "Activate"} User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to {u.isActive ? "suspend" : "activate"} {u.email}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={u.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                              onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isActive: !u.isActive } })}
                            >
                              {u.isActive ? "Suspend" : "Activate"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300">No users found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const TemplateManagement = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null);
    const [form, setForm] = useState({ name: "", type: "split-sheet", description: "", templateJson: "{}" });

    const openCreate = () => {
      setEditingTemplate(null);
      setForm({ name: "", type: "split-sheet", description: "", templateJson: JSON.stringify({ fields: [] }, null, 2) });
      setDialogOpen(true);
    };

    const openEdit = (t: AdminTemplate) => {
      setEditingTemplate(t);
      setForm({
        name: t.name,
        type: t.type,
        description: t.description ?? "",
        templateJson: JSON.stringify(t.template ?? {}, null, 2),
      });
      setDialogOpen(true);
    };

    const saveMutation = useMutation({
      mutationFn: async () => {
        let parsedTemplate: any;
        try {
          parsedTemplate = JSON.parse(form.templateJson);
        } catch {
          throw new Error("Template JSON is invalid");
        }
        const payload = {
          name: form.name,
          type: form.type,
          description: form.description,
          template: parsedTemplate,
        };
        if (editingTemplate) {
          return apiRequest('PATCH', `/api/admin/templates/${editingTemplate.id}`, payload);
        }
        return apiRequest('POST', '/api/admin/templates', payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
        toast({ title: editingTemplate ? "Template updated" : "Template created" });
        setDialogOpen(false);
      },
      onError: (error: any) => {
        toast({ title: error?.message || "Failed to save template", variant: "destructive" });
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => apiRequest('DELETE', `/api/admin/templates/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
        toast({ title: "Template archived" });
      },
      onError: () => {
        toast({ title: "Failed to archive template", variant: "destructive" });
      },
    });

    const restoreMutation = useMutation({
      mutationFn: async (id: string) => apiRequest('PATCH', `/api/admin/templates/${id}`, { isActive: true }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
        toast({ title: "Template restored" });
      },
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Contract Templates</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                <DialogDescription>
                  Define the contract template structure. The template field must be valid JSON.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Name</Label>
                  <Input
                    id="template-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    data-testid="input-template-name"
                  />
                </div>
                <div>
                  <Label htmlFor="template-type">Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}>
                    <SelectTrigger id="template-type" data-testid="select-template-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    data-testid="input-template-description"
                  />
                </div>
                <div>
                  <Label htmlFor="template-json">Template Fields (JSON)</Label>
                  <Textarea
                    id="template-json"
                    value={form.templateJson}
                    onChange={(e) => setForm((f) => ({ ...f, templateJson: e.target.value }))}
                    className="font-mono text-xs h-40"
                    data-testid="input-template-json"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-template">Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-template">
                  {saveMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoadingTemplates ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(templates ?? []).map((t) => (
                    <TableRow key={t.id} data-testid={`row-template-${t.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-template-name-${t.id}`}>{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TEMPLATE_TYPES.find((x) => x.value === t.type)?.label ?? t.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={t.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>
                          {t.isActive ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(t.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)} data-testid={`button-edit-template-${t.id}`}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {t.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteMutation.mutate(t.id)}
                              data-testid={`button-archive-template-${t.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => restoreMutation.mutate(t.id)} data-testid={`button-restore-template-${t.id}`}>
                              Restore
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!templates || templates.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300">No templates yet</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const RevenueAnalytics = () => {
    const bySource = (revenueAnalytics?.revenueBySource ?? []).map((r: any) => ({
      name: r.source,
      value: parseFloat(r.total),
    }));
    const byMonth = (revenueAnalytics?.revenueByMonth ?? []).map((r: any) => ({
      month: r.month,
      total: parseFloat(r.total),
    }));
    const subscriptionBreakdown = revenueAnalytics?.subscriptionBreakdown ?? [];
    const topEarners = revenueAnalytics?.topEarners ?? [];

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Revenue Analytics</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Revenue Tracked"
            value={isLoadingRevenue ? "…" : formatCurrency(revenueAnalytics?.totalRevenue ?? 0)}
            description="All recorded revenue events"
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Total Payouts"
            value={isLoadingRevenue ? "…" : formatCurrency(revenueAnalytics?.totalPayouts ?? 0)}
            description="Distributed to rights holders"
            icon={Wallet}
            color="blue"
          />
          <StatCard
            title="Active Subscribers"
            value={isLoadingRevenue ? "…" : subscriptionBreakdown.reduce((sum: number, s: any) => sum + (s.tier !== "free" ? Number(s.count) : 0), 0)}
            description="Paying subscription tiers"
            icon={TrendingUp}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Revenue by Month</CardTitle>
              <CardDescription>Total revenue events recorded per month</CardDescription>
            </CardHeader>
            <CardContent>
              {byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">No revenue data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Source</CardTitle>
              <CardDescription>Streaming, sync, performance, mechanical, other</CardDescription>
            </CardHeader>
            <CardContent>
              {bySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {bySource.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">No revenue data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Breakdown</CardTitle>
              <CardDescription>Users by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subscriptionBreakdown.map((s: any) => ({ tier: s.tier ?? "free", count: Number(s.count) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">No subscription data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Earners</CardTitle>
              <CardDescription>Users with the highest total earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {topEarners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEarners.map((e: any) => (
                      <TableRow key={e.userId} data-testid={`row-earner-${e.userId}`}>
                        <TableCell>
                          <div className="font-medium">{e.firstName} {e.lastName}</div>
                          <div className="text-xs text-muted-foreground">{e.email}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(e.totalEarned ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(e.pendingBalance ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">No earnings recorded yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const SystemMonitoring = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">System Monitoring</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={(adminStats as any)?.userStats?.totalUsers || "0"}
          description="All registered users"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Today"
          value={(adminStats as any)?.userStats?.activeUsers || "0"}
          description="Users active today"
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Templates"
          value={templates?.length ?? "0"}
          description="Total contract templates"
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="System Health"
          value="Good"
          description="All systems operational"
          icon={CheckCircle}
          color="green"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system activity and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : Array.isArray(recentActivity) && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.slice(0, 10).map((entry: any, i: number) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{entry.activity?.activityType ?? "Activity"}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.user?.email ?? "Unknown user"} · {entry.activity?.createdAt ? new Date(entry.activity.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Manage users, edit templates, and monitor platform revenue
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Settings className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={(adminStats as any)?.userStats?.totalUsers || "0"}
              description="All registered users"
              icon={Users}
            />
            <StatCard
              title="Active Users"
              value={(adminStats as any)?.userStats?.activeUsers || "0"}
              description="Users active this month"
              icon={Activity}
            />
            <StatCard
              title="Total Revenue"
              value={isLoadingRevenue ? "…" : formatCurrency(revenueAnalytics?.totalRevenue ?? 0)}
              description="All recorded revenue"
              icon={DollarSign}
            />
            <StatCard
              title="Templates"
              value={templates?.length ?? "0"}
              description="Active contract templates"
              icon={FileText}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Healthy
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>API Response Time</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Good
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((entry: any, i: number) => (
                      <div key={i} className="flex items-center space-x-3 text-sm">
                        <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{entry.activity?.activityType ?? "Activity"} — {entry.user?.email ?? "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateManagement />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <SystemMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
}
