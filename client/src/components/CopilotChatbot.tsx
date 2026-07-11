import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User as UserIcon } from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const CopilotChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! I'm your SoundLedger Co-pilot. I can help you with onboarding, walkthroughs, and explaining our music agreement systems. How can I assist you today?", sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await apiRequest('POST', '/api/chatbot', { query: currentInput });
      const data = await response.json();
      const botMessage: Message = { text: data.response || "I'm sorry, I couldn't process that.", sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      const errorMessage: Message = { text: "Oops! Something went wrong. Please try again later.", sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center space-x-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">SoundLedger Co-pilot</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] items-start space-x-2 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {msg.sender === 'user' ? <UserIcon className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="mt-1 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-2xl rounded-tl-none animate-pulse flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border bg-card">
        <div className="flex space-x-2">
          <Input
            className="flex-1 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary h-9 text-sm"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            disabled={loading}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0"
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CopilotChatbot;
