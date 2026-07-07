"use client";

import { GripVertical, Upload } from "lucide-react";
import type { AssessmentQuestion } from "@/features/assessment-engine/types";
import { Input } from "@/shared/ui/input";
import { Checkbox, Radio, Textarea } from "@/shared/ui/forms";

type QuestionProps = {
  onResponse(value: Record<string, unknown>): void;
  question: AssessmentQuestion;
};

export function MCQQuestion({ onResponse, question }: QuestionProps) {
  const selected =
    typeof question.response.selectedOptionId === "string"
      ? question.response.selectedOptionId
      : "";
  return (
    <fieldset className="assessment-choices">
      <legend className="sr-only">Choose one answer</legend>
      {question.options.map((option) => (
        <Radio
          checked={selected === option.optionId}
          key={option.optionId}
          label={option.content}
          name={question.attemptItemId}
          onChange={() => onResponse({ selectedOptionId: option.optionId })}
          value={option.optionId}
        />
      ))}
    </fieldset>
  );
}

export function MultipleChoiceQuestion({ onResponse, question }: QuestionProps) {
  const selected = new Set(
    Array.isArray(question.response.selectedOptionIds)
      ? question.response.selectedOptionIds.filter(
          (item): item is string => typeof item === "string"
        )
      : []
  );
  return (
    <fieldset className="assessment-choices">
      <legend className="sr-only">Choose one or more answers</legend>
      {question.options.map((option) => (
        <Checkbox
          checked={selected.has(option.optionId)}
          key={option.optionId}
          label={option.content}
          onChange={(event) => {
            const next = new Set(selected);
            if (event.target.checked) next.add(option.optionId);
            else next.delete(option.optionId);
            onResponse({ selectedOptionIds: Array.from(next) });
          }}
          value={option.optionId}
        />
      ))}
    </fieldset>
  );
}

export function TrueFalseQuestion(props: QuestionProps) {
  const options = props.question.options.length
    ? props.question.options
    : [
        { content: "True", optionId: "true", stableKey: "true" },
        { content: "False", optionId: "false", stableKey: "false" }
      ];
  return <MCQQuestion {...props} question={{ ...props.question, options }} />;
}

export function EssayQuestion({ onResponse, question }: QuestionProps) {
  return (
    <Textarea
      aria-label="Essay response"
      defaultValue={typeof question.response.text === "string" ? question.response.text : ""}
      onChange={(event) => onResponse({ text: event.target.value })}
      rows={12}
    />
  );
}

export function ShortAnswerQuestion({ onResponse, question }: QuestionProps) {
  return (
    <Input
      aria-label="Short answer"
      defaultValue={typeof question.response.text === "string" ? question.response.text : ""}
      onChange={(event) => onResponse({ text: event.target.value })}
    />
  );
}

export function MatchingQuestion({ onResponse, question }: QuestionProps) {
  return (
    <Textarea
      aria-label="Matching response"
      defaultValue={typeof question.response.text === "string" ? question.response.text : ""}
      onChange={(event) => onResponse({ text: event.target.value })}
      placeholder="Enter each match on a separate line"
      rows={7}
    />
  );
}

export function OrderingQuestion({ onResponse, question }: QuestionProps) {
  const order = Array.isArray(question.response.order)
    ? question.response.order.filter((item): item is string => typeof item === "string")
    : question.options.map((option) => option.optionId);
  return (
    <div className="assessment-ordering">
      {order.map((id, index) => {
        const option = question.options.find((item) => item.optionId === id);
        return option ? (
          <div key={id}>
            <GripVertical aria-hidden="true" />
            <span>{option.content}</span>
            <span>{index + 1}</span>
          </div>
        ) : null;
      })}
      <button className="sr-only" onClick={() => onResponse({ order })} type="button">
        Confirm current order
      </button>
    </div>
  );
}

export function FileUploadQuestion() {
  return (
    <div className="assessment-unsupported" role="status">
      <Upload aria-hidden="true" />
      <strong>Secure file upload is not enabled</strong>
      <p>This assessment item requires the future approved response-attachment wave.</p>
    </div>
  );
}

export function QuestionRenderer(props: QuestionProps) {
  switch (props.question.type) {
    case "single_choice":
      return <MCQQuestion {...props} />;
    case "multiple_choice":
      return <MultipleChoiceQuestion {...props} />;
    case "true_false":
      return <TrueFalseQuestion {...props} />;
    case "long_text":
      return <EssayQuestion {...props} />;
    case "short_text":
    case "numeric":
      return <ShortAnswerQuestion {...props} />;
    case "matching":
      return <MatchingQuestion {...props} />;
    case "ordering":
      return <OrderingQuestion {...props} />;
    case "file_upload":
      return <FileUploadQuestion />;
  }
}
