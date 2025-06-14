import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ConversationThread from "@/components/conversation-thread";
import type { ConversationWithCustomer } from "@/lib/types";

export default function Conversations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: allConversations, isLoading } = useQuery<ConversationWithCustomer[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activeConversations } = useQuery<ConversationWithCustomer[]>({
    queryKey: ["/api/conversations/active"],
  });

  const conversations = allConversations || [];
  const active = activeConversations || [];
  const inactive = conversations.filter(c => !c.isActive);
  
  // Separate test conversations (customers with Test in name or phone starting with +12345)
  const testConversations = conversations.filter(c => 
    c.customer.name?.includes('Test') || 
    c.customer.name?.includes('test') ||
    c.customer.phoneNumber.startsWith('+12345')
  );
  const realConversations = conversations.filter(c => 
    !c.customer.name?.includes('Test') && 
    !c.customer.name?.includes('test') &&
    !c.customer.phoneNumber.startsWith('+12345')
  );

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: number) => 
      apiRequest("DELETE", `/api/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/active"] });
      toast({
        title: "Success",
        description: "Test conversation deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete conversation: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/conversations/active"] });
  };

  const handleDeleteConversation = (conversationId: number) => {
    if (confirm("Are you sure you want to delete this test conversation?")) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  const ConversationsList = ({ 
    conversations: convList, 
    showDelete = false 
  }: { 
    conversations: ConversationWithCustomer[], 
    showDelete?: boolean 
  }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {convList.length > 0 ? (
        convList.map((conversation) => (
          <div key={conversation.id} className="relative">
            <ConversationThread conversation={conversation} />
            {showDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => handleDeleteConversation(conversation.id)}
                disabled={deleteConversationMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))
      ) : (
        <div className="col-span-full text-center text-slate-500 py-12">
          <i className="fas fa-comments text-6xl mb-4 opacity-50"></i>
          <h3 className="text-lg font-medium mb-2">No conversations found</h3>
          <p>Customer conversations will appear here when they message your WhatsApp.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Conversations</h2>
            <p className="text-slate-600 mt-1">Monitor customer interactions with your AI assistant</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                {active.length} Active Conversation{active.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="animate-pulse">
                        <div className="h-6 bg-slate-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
                  <TabsTrigger value="all">All ({realConversations.length})</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive ({inactive.length})</TabsTrigger>
                  <TabsTrigger value="test" className="flex items-center space-x-1">
                    <TestTube className="w-4 h-4" />
                    <span>Test ({testConversations.length})</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-6">
                  <ConversationsList conversations={active.filter(c => !testConversations.includes(c))} />
                </TabsContent>
                
                <TabsContent value="all" className="mt-6">
                  <ConversationsList conversations={realConversations} />
                </TabsContent>
                
                <TabsContent value="inactive" className="mt-6">
                  <ConversationsList conversations={inactive.filter(c => !testConversations.includes(c))} />
                </TabsContent>
                
                <TabsContent value="test" className="mt-6">
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <TestTube className="w-5 h-5" />
                      <h3 className="font-medium">Test Conversations</h3>
                    </div>
                    <p className="text-sm text-orange-600 mt-1">
                      These are conversations created from AI testing. You can delete them to keep your database clean.
                    </p>
                  </div>
                  <ConversationsList conversations={testConversations} showDelete={true} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
