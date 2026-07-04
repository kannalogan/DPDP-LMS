"use client";
import { Bot, Check, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/shared/ui/feedback";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/forms";
import { ApprovalDialog } from "@/shared/ui/overlays";
export function AiChatWindow({
  children,
  title = "SYRA Assistant"
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="ai-chat">
      <header>
        <Bot />
        <h2>{title}</h2>
      </header>
      <div aria-live="polite" className="ai-chat-messages">
        {children}
      </div>
    </section>
  );
}
export function AiPromptBox({
  disabled,
  onSubmit,
  placeholder = "Ask SYRA"
}: {
  disabled?: boolean;
  onSubmit(value: string): void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="ai-prompt"
      onSubmit={(event) => {
        event.preventDefault();
        const prompt = value.trim();
        if (prompt) {
          onSubmit(prompt);
          setValue("");
        }
      }}
    >
      <Textarea
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
      <Button
        aria-label="Send prompt"
        disabled={disabled || !value.trim()}
        size="icon"
        type="submit"
      >
        <Send />
      </Button>
    </form>
  );
}
export function AiSuggestionCard({
  description,
  onAccept,
  title
}: {
  description: string;
  onAccept(): void;
  title: string;
}) {
  return (
    <article className="ai-suggestion">
      <Bot aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Button onClick={onAccept} size="sm">
        <Check />
        Use
      </Button>
    </article>
  );
}
export function AiCitationCard({
  excerpt,
  href,
  source
}: {
  excerpt: string;
  href: string;
  source: string;
}) {
  return (
    <a className="ai-citation" href={href} rel="noreferrer" target="_blank">
      <strong>{source}</strong>
      <span>{excerpt}</span>
    </a>
  );
}
export function AiThinkingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div aria-live="polite" className="ai-thinking">
      <span />
      <span />
      <span />
      <span className="sr-only">{label}</span>
    </div>
  );
}
export function AiStreamingResponse({
  children,
  complete
}: {
  children: ReactNode;
  complete: boolean;
}) {
  return (
    <div
      aria-busy={!complete}
      aria-live="polite"
      className={complete ? "ai-stream is-complete" : "ai-stream"}
    >
      {children}
    </div>
  );
}
export function AiFeedbackWidget({
  onFeedback
}: {
  onFeedback(value: "helpful" | "unhelpful"): void;
}) {
  return (
    <div aria-label="Rate response" className="ai-feedback" role="group">
      <Button
        aria-label="Helpful"
        onClick={() => onFeedback("helpful")}
        size="icon"
        variant="ghost"
      >
        <ThumbsUp />
      </Button>
      <Button
        aria-label="Not helpful"
        onClick={() => onFeedback("unhelpful")}
        size="icon"
        variant="ghost"
      >
        <ThumbsDown />
      </Button>
    </div>
  );
}
export function AiConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return (
    <Badge tone={percent >= 80 ? "success" : percent >= 60 ? "warning" : "danger"}>
      {percent}% confidence
    </Badge>
  );
}
export function AiActionApprovalDialog(
  props: Omit<Parameters<typeof ApprovalDialog>[0], "actionLabel">
) {
  return <ApprovalDialog actionLabel="Approve action" {...props} />;
}
