"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Conversation, Message, FileAttachment } from "@/types/chat";
import {
  getConversations,
  createConversation,
  getMessages,
  updateConversation,
  deleteConversation,
} from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, X, MessageSquarePlus, Wifi, WifiOff } from "lucide-react";

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  const { isConnected, isStreaming, sendMessage } = useWebSocket({
    onMessageSaved: (data) => {
      // Message saved acknowledgment - we already added it optimistically
    },
    onStreamStart: () => {
      setStreamingContent("");
    },
    onStreamChunk: (content) => {
      setStreamingContent((prev) => prev + content);
      // Scroll less frequently during streaming for smoother experience
      requestAnimationFrame(scrollToBottom);
    },
    onStreamEnd: (data) => {
      // Add the complete assistant message
      const assistantMessage: Message = {
        id: data.id,
        conversation_id: currentConversationId!,
        role: "assistant",
        content: data.content,
        attachments: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
      scrollToBottom();
    },
    onTitleUpdated: (data) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversation_id ? { ...c, title: data.title } : c
        )
      );
    },
    onError: (message) => {
      console.error("Chat error:", message);
      setStreamingContent("");
      // You could show a toast notification here
    },
  });

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const data = await getConversations();
      setConversations(data);

      // Select the first conversation if available
      if (data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const conversation = await createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setCurrentConversationId(conversation.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await updateConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch (error) {
      console.error("Failed to rename conversation:", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // Select another conversation if the deleted one was selected
      if (currentConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleSendMessage = async (
    content: string,
    attachments: FileAttachment[]
  ) => {
    if (!currentConversationId) {
      // Create a new conversation first
      const conversation = await createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setCurrentConversationId(conversation.id);

      // Wait a bit for state to update, then send
      setTimeout(() => {
        sendMessageToServer(conversation.id, content, attachments);
      }, 100);
    } else {
      sendMessageToServer(currentConversationId, content, attachments);
    }
  };

  const sendMessageToServer = (
    conversationId: string,
    content: string,
    attachments: FileAttachment[]
  ) => {
    // Optimistically add user message
    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content,
      attachments,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via WebSocket
    sendMessage(conversationId, content, attachments);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {isLoadingConversations ? (
          <div className="flex h-full w-64 flex-col border-r bg-muted/30 p-4">
            <Skeleton className="mb-4 h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 pl-12 md:pl-0">
            <h1 className="text-lg font-semibold">Chat Document</h1>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </header>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {!currentConversationId ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Welcome to Chat Document</h2>
              <p className="max-w-md text-muted-foreground">
                Upload images or PDFs and chat with an AI that can understand and
                discuss your documents.
              </p>
              <Button onClick={handleNewConversation}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Start a new conversation
              </Button>
            </div>
          ) : isLoadingMessages ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-muted-foreground">
                No messages yet. Start chatting or upload a file to discuss.
              </p>
            </div>
          ) : (
            <div className="pb-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {messages.length > 0 &&
                messages[messages.length - 1].role === "user" &&
                !streamingContent && (
                  <ThinkingIndicator />
                )}
              {streamingContent && (
                <ChatMessage
                  message={{
                    id: "streaming",
                    conversation_id: currentConversationId,
                    role: "assistant",
                    content: streamingContent,
                    attachments: [],
                    created_at: new Date().toISOString(),
                  }}
                  isStreaming={true}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {currentConversationId && (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected}
            isStreaming={isStreaming}
          />
        )}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
