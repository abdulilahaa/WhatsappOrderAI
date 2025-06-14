import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationWithCustomer, Message } from "@/lib/types";

interface ConversationThreadProps {
  conversation: ConversationWithCustomer;
}

export default function ConversationThread({ conversation }: ConversationThreadProps) {
  const { data: messages, isLoading, error } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversation.id}/messages`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loading messages...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Error loading conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Failed to load messages for this conversation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {conversation.customer.name || "Unknown Customer"}
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">{conversation.customer.phoneNumber}</p>
          <span className="text-xs text-slate-500">
            {messages?.length || 0} message{messages?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {messages && messages.length > 0 ? messages.map((message) => (
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
                        {new Date(message.timestamp).toLocaleString()}
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
                        {new Date(message.timestamp).toLocaleString()}
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
            )) : (
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
