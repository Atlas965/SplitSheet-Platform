import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, MessageSquare, Users, Clock, CheckCircle, XCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Negotiation } from "@shared/schema";
import * as React from "react";

const createNegotiationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  participants: z.string().min(1, "Participants are required"),
  aiAssistantEnabled: z.boolean().default(true),
});

type CreateNegotiationData = z.infer<typeof createNegotiationSchema>;

export default function Negotiations() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: negotiations, isLoading } = useQuery<Negotiation[]>({
    queryKey: ['/api/negotiations'],
  });

  const form = useForm<CreateNegotiationData>({
    resolver: zodResolver(createNegotiationSchema),
    defaultValues: {
      title: "",
      description: "",
      participants: "",
      aiAssistantEnabled: true,
    },
  });

  const createNegotiationMutation = useMutation({
    mutationFn: async (data: CreateNegotiationData) => {
      const participants = data.participants.split(',').map(p => p.trim()).filter(p => p);
      return await apiRequest("POST", "/api/negotiations", {
        ...data,
        participants,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/negotiations'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Negotiation created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create negotiation",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="negotiations-title">AI-Powered Negotiations</h1>
            <p className="text-muted-foreground">
              Manage your negotiations with intelligent AI assistance
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-negotiation">
                <Plus className="h-4 w-4 mr-2" />
                New Negotiation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Negotiation</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createNegotiationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter negotiation title" 
                            data-testid="input-negotiation-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the negotiation details" 
                            data-testid="input-negotiation-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participants</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter participant IDs (comma-separated)" 
                            data-testid="input-negotiation-participants"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aiAssistantEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">AI Assistant</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable AI-powered negotiation assistance
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-ai-assistant"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-negotiation"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createNegotiationMutation.isPending}
                      data-testid="button-submit-negotiation"
                    >
                      {createNegotiationMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {negotiations?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No negotiations yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start your first AI-powered negotiation to experience intelligent assistance and conversation analysis.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-first-negotiation">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Negotiation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {negotiations?.map((negotiation) => (
              <Card key={negotiation.id} className="hover:shadow-lg transition-shadow" data-testid={`card-negotiation-${negotiation.id}`}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2" data-testid={`text-negotiation-title-${negotiation.id}`}>
                      {negotiation.title}
                    </CardTitle>
                    <Badge className={getStatusColor(negotiation.status || 'active')}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(negotiation.status || 'active')}
                        <span className="capitalize">{negotiation.status || 'active'}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  {negotiation.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-negotiation-description-${negotiation.id}`}>
                      {negotiation.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {negotiation.participants?.length || 0} participants
                    </span>
                  </div>
                  
                  {negotiation.aiAssistantEnabled && (
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600 dark:text-blue-400">AI Assistant Enabled</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(negotiation.createdAt!).toLocaleDateString()}
                    </span>
                    <Link href={`/negotiations/${negotiation.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-negotiation-${negotiation.id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}