"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex gap-4 px-4 py-6 bg-muted/30">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-secondary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="font-medium text-sm">Assistant</div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
