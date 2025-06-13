import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationWithCustomer, Message } from "@/lib/types";

interface ConversationThreadProps {
  conversation: ConversationWithCustomer;
}

export default function ConversationThread({ conversation }: ConversationThreadProps) {
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loading conversation...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {conversation.customer.name || "Unknown Customer"}
        </CardTitle>
        <p className="text-sm text-slate-600">{conversation.customer.phoneNumber}</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {messages?.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${
                  message.isFromAI ? "justify-end" : ""
                }`}
              >
                {!message.isFromAI ? (
                  <>
                    <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-slate-600 text-xs"></i>
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-100 rounded-lg p-3 max-w-xs">
                        <p className="text-sm text-slate-800">{message.content}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <div className="bg-whatsapp rounded-lg p-3 max-w-xs ml-auto">
                      <p className="text-sm text-white">{message.content}</p>
                    </div>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className="text-xs text-slate-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      <i className="fas fa-robot text-ai text-xs" title="AI Response"></i>
                    </div>
                  </div>
                )}
                
                {message.isFromAI && (
                  <div className="w-8 h-8 bg-whatsapp rounded-full flex items-center justify-center">
                    <i className="fas fa-robot text-white text-xs"></i>
                  </div>
                )}
              </div>
            ))}
            
            {(!messages || messages.length === 0) && (
              <div className="text-center text-slate-500 py-8">
                No messages in this conversation yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
