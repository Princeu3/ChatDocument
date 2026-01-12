"use client";

import { Message, FileAttachment } from "@/types/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { User, Bot, FileText, Image as ImageIcon } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function FileAttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  if (attachment.type === "image") {
    return (
      <div className="relative mt-2 overflow-hidden rounded-lg border">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-64 max-w-full object-contain"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
          {attachment.name}
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors"
    >
      <FileText className="h-4 w-4 text-red-500" />
      <span className="truncate">{attachment.name}</span>
    </a>
  );
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-4 px-4 py-6 ${
        isUser ? "bg-transparent" : "bg-muted/30"
      }`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-primary" : "bg-secondary"}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="font-medium text-sm">
          {isUser ? "You" : "Assistant"}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <FileAttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Message content */}
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-hr:my-6">
          <ReactMarkdown
            components={{
              pre: ({ children }) => (
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 my-4">
                  {children}
                </pre>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code
                    className="rounded bg-muted px-1.5 py-0.5 text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => (
                <p className="my-3 leading-relaxed">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="my-3 ml-4 list-disc space-y-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-3 ml-4 list-decimal space-y-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted-foreground/30 pl-4 my-4 italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-6 border-muted-foreground/20" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
          )}
        </div>
      </div>
    </div>
  );
}
