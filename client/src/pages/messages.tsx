import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface MessagePartner {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

interface Conversation {
  partner: MessagePartner;
  latestMessage: ChatMessage;
  unreadCount: number;
}

export default function MessagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const [, params] = useRoute("/messages/:userId");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(params?.userId || null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params?.userId) setSelectedConversation(params.userId);
  }, [params?.userId]);

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setMessageText("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (senderId: string) => {
      return await apiRequest("PATCH", `/api/conversations/${senderId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  useEffect(() => {
    if (selectedConversation && messages?.length) {
      markAsReadMutation.mutate(selectedConversation);
    }
  }, [selectedConversation, messages?.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      receiverId: selectedConversation,
      content: messageText.trim(),
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectConversation = (partnerId: string) => {
    setSelectedConversation(partnerId);
    window.history.pushState({}, "", `/messages/${partnerId}`);
  };

  const ConversationList = () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h2>
          <Badge variant="outline" className="text-xs gap-1">
            <Lock className="h-3 w-3" />
            Encrypted
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {isLoadingConversations ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations?.map((conversation) => {
                const partner = conversation.partner;
                const isSelected = selectedConversation === partner.id;

                return (
                  <div
                    key={partner.id}
                    className={cn(
                      "flex items-center space-x-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-primary/5",
                    )}
                    onClick={() => selectConversation(partner.id)}
                    data-testid={`conversation-${partner.id}`}
                  >
                    <Avatar>
                      <AvatarImage src={partner.profileImageUrl ?? undefined} />
                      <AvatarFallback>
                        {partner.firstName?.[0]}{partner.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium truncate">
                          {partner.firstName} {partner.lastName}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.latestMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.latestMessage.content}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="default">{conversation.unreadCount}</Badge>
                    )}
                  </div>
                );
              })}
              {(!conversations || conversations.length === 0) && (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect with collaborators from Search or Matches to start messaging.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/search">Find people</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const MessageView = () => {
    if (!selectedConversation) {
      return (
        <Card className="h-full flex items-center justify-center">
          <div className="text-center px-6">
            <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Messages are encrypted in transit (TLS) and at rest (AES-256-GCM) on our servers.
            </p>
          </div>
        </Card>
      );
    }

    const selectedPartner = conversations?.find((c) => c.partner.id === selectedConversation)?.partner;

    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-row items-center space-y-0 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 md:hidden"
            onClick={() => {
              setSelectedConversation(null);
              window.history.pushState({}, "", "/messages");
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={selectedPartner?.profileImageUrl ?? undefined} />
            <AvatarFallback>
              {selectedPartner?.firstName?.[0]}{selectedPartner?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {selectedPartner?.firstName} {selectedPartner?.lastName}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              End-to-end TLS · encrypted at rest
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn("flex animate-pulse", i % 2 === 0 ? "justify-start" : "justify-end")}>
                      <div className={cn("max-w-xs p-3 rounded-lg bg-muted", i % 2 !== 0 && "bg-primary/20")} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {messages?.map((message) => {
                    const isOwn = message.senderId === currentUserId;

                    return (
                      <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                          data-testid={`message-${message.id}`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={cn("text-xs mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                maxLength={5000}
                disabled={sendMessageMutation.isPending}
                data-testid="input-message"
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Secure operator messaging — TLS in transit, AES-256-GCM at rest
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
        <div className={cn("md:col-span-1", selectedConversation && "hidden md:block")}>
          <ConversationList />
        </div>

        <div className={cn("md:col-span-2", !selectedConversation && "hidden md:block")}>
          <MessageView />
        </div>
      </div>
    </div>
  );
}
