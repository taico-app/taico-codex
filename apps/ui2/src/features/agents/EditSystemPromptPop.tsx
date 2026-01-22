import React, { useEffect, useRef, useState } from "react";
import { PopShell } from "../../app/shells/PopShell";
import "./EditSystemPromptPop.css";

type EditSystemPromptPopProps = {
  initialValue: string;
  onCancel?: () => void;
  onSave: (payload: { systemPrompt: string }) => Promise<boolean>;
};

export function EditSystemPromptPop({ initialValue, onCancel, onSave }: EditSystemPromptPopProps) {
  const [content, setContent] = useState(initialValue);

  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function handleSave(): Promise<boolean> {
    return onSave({ systemPrompt: content });
  }

  return (
    <PopShell
      title="Edit System Prompt"
      onCancel={onCancel}
      onSave={handleSave}
    >
      <>
        {/* System Prompt */}
        <div className="edit-system-prompt-pop__input-content">
          <textarea
            className="edit-system-prompt-pop__input-content"
            ref={contentRef}
            placeholder="Enter system prompt..."
            value={content}
            onChange={handleContentChange}
          />
        </div>
      </>
    </PopShell>
  );
}
