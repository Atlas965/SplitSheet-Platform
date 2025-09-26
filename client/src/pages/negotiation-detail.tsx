import { useState } from "react";
import { useParams, Link } from "wouter";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, ArrowLeft, Send, MessageSquare, Users, Clock, CheckCircle, 
  XCircle, Brain, User, Bot, Lightbulb, TrendingUp, AlertTriangle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Negotiation, NegotiationConversation } from "@shared/schema";
import * as React from "react";

const messageSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

type MessageData = z.infer<typeof messageSchema>;

export default function NegotiationDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const [isAiThinking, setIsAiThinking] = useState(false);

  const { data: negotiation, isLoading: negotiationLoading } = useQuery<Negotiation>({
    queryKey: ['/api/negotiations', id],
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<NegotiationConversation[]>({
    queryKey: ['/api/negotiations', id, 'conversations'],
    enabled: !!id,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    staleTime: 1000, // Consider data fresh for 1 second
  });

  const form = useForm<MessageData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageData) => {
      return await apiRequest("POST", `/api/negotiations/${id}/conversations`, {
        message: data.message,
        messageType: "text",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/negotiations', id, 'conversations'] });
      form.reset();
      
      // AI analysis now happens automatically on the server side
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });


  const updateNegotiationStatus = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/negotiations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/negotiations', id] });
      toast({
        title: "Success",
        description: "Negotiation status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
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

  const getMessageIcon = (messageType: string, senderId: string) => {
    if (messageType === "ai_suggestion") return <Bot className="h-4 w-4 text-blue-500" />;
    if (messageType === "system") return <Lightbulb className="h-4 w-4 text-amber-500" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const getSentimentIcon = (score: number | null) => {
    if (!score) return null;
    if (score > 0.3) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (score < -0.3) return <AlertTriangle className="h-3 w-3 text-red-500" />;
    return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
  };

  const getSentimentColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score > 0.3) return "text-green-600 dark:text-green-400";
    if (score < -0.3) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  if (negotiationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Negotiation not found</h2>
          <p className="text-muted-foreground mb-4">The negotiation you're looking for doesn't exist.</p>
          <Link href="/negotiations">
            <Button>Back to Negotiations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/negotiations">
            <Button variant="outline" size="sm" data-testid="button-back-negotiations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Negotiations
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-negotiation-title">{negotiation.title}</h1>
            <p className="text-muted-foreground">{negotiation.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(negotiation.status || 'active')}>
              <span className="capitalize">{negotiation.status || 'active'}</span>
            </Badge>
            {negotiation.aiAssistantEnabled && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Brain className="h-3 w-3 mr-1" />
                AI Enabled
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Conversation</span>
                  {isAiThinking && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is analyzing...</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  {conversationsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : conversations?.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversations?.map((conversation) => (
                        <div 
                          key={conversation.id} 
                          className={`flex ${conversation.senderId === userId ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${conversation.id}`}
                        >
                          <div className={`max-w-[70%] ${
                            conversation.messageType === 'ai_suggestion' 
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                              : conversation.senderId === userId 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                          } rounded-lg p-3 space-y-2`}>
                            <div className="flex items-center space-x-2">
                              {getMessageIcon(conversation.messageType!, conversation.senderId)}
                              <span className="text-xs font-medium">
                                {conversation.messageType === 'ai_suggestion' 
                                  ? 'AI Assistant' 
                                  : conversation.senderId === userId 
                                    ? 'You' 
                                    : 'Participant'
                                }
                              </span>
                              {conversation.sentimentScore && (
                                <div className="flex items-center space-x-1">
                                  {getSentimentIcon(Number(conversation.sentimentScore))}
                                  <span className={`text-xs ${getSentimentColor(Number(conversation.sentimentScore))}`}>
                                    {(Number(conversation.sentimentScore) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm" data-testid={`text-message-${conversation.id}`}>
                              {conversation.message}
                            </p>
                            <p className="text-xs opacity-70">
                              {new Date(conversation.createdAt!).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="border-t p-4">
                  <Form {...form}>
                    <form 
                      onSubmit={form.handleSubmit((data) => sendMessageMutation.mutate(data))} 
                      className="flex space-x-2"
                    >
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input 
                                placeholder="Type your message..." 
                                data-testid="input-message"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={sendMessageMutation.isPending || negotiation.status !== 'active'}
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Participants</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Creator</p>
                    <p className="text-xs text-muted-foreground">{negotiation.createdBy}</p>
                  </div>
                </div>
                {negotiation.participants?.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{participant.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Participant</p>
                      <p className="text-xs text-muted-foreground">{participant}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            {negotiation.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => updateNegotiationStatus.mutate('completed')}
                    disabled={updateNegotiationStatus.isPending}
                    data-testid="button-complete-negotiation"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 hover:text-red-700"
                    onClick={() => updateNegotiationStatus.mutate('cancelled')}
                    disabled={updateNegotiationStatus.isPending}
                    data-testid="button-cancel-negotiation"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}