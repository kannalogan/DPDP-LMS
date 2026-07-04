"use client";
import { Bold, Italic, List } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/shared/ui/button";
export function RichTextEditor({
  label,
  onChange,
  value
}: {
  label: string;
  onChange(value: string): void;
  value: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const command = (name: "bold" | "italic" | "insertUnorderedList") => {
    document.execCommand(name);
    onChange(ref.current?.innerHTML ?? "");
  };
  return (
    <div className="ui-editor">
      <span id="editor-label">{label}</span>
      <div aria-label="Formatting" className="ui-editor-toolbar" role="toolbar">
        <Button aria-label="Bold" onClick={() => command("bold")} size="icon" variant="ghost">
          <Bold />
        </Button>
        <Button aria-label="Italic" onClick={() => command("italic")} size="icon" variant="ghost">
          <Italic />
        </Button>
        <Button
          aria-label="Bulleted list"
          onClick={() => command("insertUnorderedList")}
          size="icon"
          variant="ghost"
        >
          <List />
        </Button>
      </div>
      <div
        aria-labelledby="editor-label"
        className="ui-editor-content"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        ref={ref}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}
