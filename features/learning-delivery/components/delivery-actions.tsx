"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  bookmarkLesson,
  completeLesson,
  deleteLessonNote,
  removeLessonBookmark,
  removeResourceBookmark,
  resumeCourse,
  saveLessonNote,
  startCourse,
  startLesson,
  updateLessonProgress,
  bookmarkResource
} from "@/features/learning-delivery/actions";
import type { LessonNoteDto } from "@/features/learning-delivery/types";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/forms";
import type { ActionResult } from "@/types/identity";

function ProgressSyncIndicator({
  pending,
  result
}: {
  pending: boolean;
  result: ActionResult | null;
}) {
  return (
    <span aria-live="polite" className="delivery-sync-status" role="status">
      {pending ? <LoaderCircle aria-hidden="true" className="ui-spin" /> : null}
      {pending ? "Synchronizing" : (result?.message ?? result?.error ?? "")}
    </span>
  );
}

export { ProgressSyncIndicator };

export function CourseStartButton({
  courseSlug,
  enrollmentId,
  resume = false
}: {
  courseSlug: string;
  enrollmentId: string | null;
  resume?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  if (!enrollmentId) return <Button disabled>Enrollment required</Button>;
  return (
    <div className="delivery-action-stack">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("courseSlug", courseSlug);
            data.set("enrollmentId", enrollmentId);
            setResult(await (resume ? resumeCourse(data) : startCourse(data)));
          })
        }
      >
        {pending ? <LoaderCircle className="ui-spin" /> : null}
        {resume ? "Resume course" : "Start course"}
      </Button>
      <ProgressSyncIndicator pending={pending} result={result} />
    </div>
  );
}

export function LessonProgressControl({
  courseSlug,
  enrollmentId,
  lessonId,
  lessonSlug,
  progress
}: {
  courseSlug: string;
  enrollmentId: string;
  lessonId: string;
  lessonSlug: string;
  progress: number;
}) {
  const [value, setValue] = useState(Math.min(progress, 99));
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="delivery-progress-control">
      <label htmlFor="lesson-progress">
        Progress <strong>{value}%</strong>
      </label>
      <input
        id="lesson-progress"
        max="99"
        min="0"
        onChange={(event) => setValue(Number(event.target.value))}
        type="range"
        value={value}
      />
      <Button
        disabled={pending || value <= progress}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("courseSlug", courseSlug);
            data.set("enrollmentId", enrollmentId);
            data.set("lessonId", lessonId);
            data.set("lessonSlug", lessonSlug);
            data.set("progress", String(value));
            setResult(await updateLessonProgress(data));
          })
        }
        size="sm"
        variant="secondary"
      >
        <Save />
        Save progress
      </Button>
      <ProgressSyncIndicator pending={pending} result={result} />
    </div>
  );
}

export function ResourceBookmarkButton({
  bookmarked,
  courseSlug,
  lessonSlug,
  resourceVersionId
}: {
  bookmarked: boolean;
  courseSlug: string;
  lessonSlug: string;
  resourceVersionId: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(bookmarked);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      aria-label={optimistic ? "Remove resource bookmark" : "Bookmark resource"}
      aria-pressed={optimistic}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          const data = new FormData();
          data.set("courseSlug", courseSlug);
          data.set("lessonSlug", lessonSlug);
          data.set("resourceVersionId", resourceVersionId);
          await (optimistic ? removeResourceBookmark(data) : bookmarkResource(data));
        })
      }
      size="icon"
      title={optimistic ? "Remove bookmark" : "Bookmark resource"}
      variant="ghost"
    >
      {optimistic ? <BookmarkCheck /> : <Bookmark />}
    </Button>
  );
}

export function LessonStartButton({
  courseSlug,
  enrollmentId,
  lessonId,
  lessonSlug
}: {
  courseSlug: string;
  enrollmentId: string;
  lessonId: string;
  lessonSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="delivery-action-stack">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("courseSlug", courseSlug);
            data.set("enrollmentId", enrollmentId);
            data.set("lessonId", lessonId);
            data.set("lessonSlug", lessonSlug);
            const next = await startLesson(data);
            setResult(next);
            if (next.success)
              router.push(`/student/courses/${courseSlug}/lessons/${lessonSlug}` as Route);
          })
        }
      >
        Open lesson
      </Button>
      <ProgressSyncIndicator pending={pending} result={result} />
    </div>
  );
}

export function LessonCompletionButton({
  completed,
  courseSlug,
  enrollmentId,
  lessonId,
  lessonSlug
}: {
  completed: boolean;
  courseSlug: string;
  enrollmentId: string;
  lessonId: string;
  lessonSlug: string;
}) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="delivery-action-stack">
      <Button
        disabled={optimisticCompleted || pending}
        onClick={() =>
          startTransition(async () => {
            setOptimisticCompleted(true);
            const data = new FormData();
            data.set("courseSlug", courseSlug);
            data.set("enrollmentId", enrollmentId);
            data.set("lessonId", lessonId);
            data.set("lessonSlug", lessonSlug);
            setResult(await completeLesson(data));
          })
        }
      >
        <CheckCircle2 />
        {optimisticCompleted ? "Completed" : "Mark complete"}
      </Button>
      <ProgressSyncIndicator pending={pending} result={result} />
    </div>
  );
}

export function LessonBookmarkButton({
  bookmarked,
  courseSlug,
  lessonId,
  lessonSlug
}: {
  bookmarked: boolean;
  courseSlug: string;
  lessonId: string;
  lessonSlug: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(bookmarked);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="delivery-action-stack">
      <Button
        aria-pressed={optimistic}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setOptimistic(!optimistic);
            const data = new FormData();
            data.set("courseSlug", courseSlug);
            data.set("lessonId", lessonId);
            data.set("lessonSlug", lessonSlug);
            setResult(await (optimistic ? removeLessonBookmark(data) : bookmarkLesson(data)));
          })
        }
        variant="secondary"
      >
        {optimistic ? <BookmarkCheck /> : <Bookmark />}
        {optimistic ? "Bookmarked" : "Bookmark"}
      </Button>
      <ProgressSyncIndicator pending={pending} result={result} />
    </div>
  );
}

export function LessonNotesPanel({
  available,
  courseSlug,
  lessonId,
  lessonSlug,
  notes,
  reason
}: {
  available: boolean;
  courseSlug: string;
  lessonId: string;
  lessonSlug: string;
  notes: LessonNoteDto[];
  reason: string | null;
}) {
  const [body, setBody] = useState(notes[0]?.body ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  if (!available)
    return (
      <section className="delivery-note-unavailable" role="status">
        <strong>Private notes unavailable</strong>
        <p>{reason}</p>
      </section>
    );
  return (
    <section className="delivery-notes" aria-labelledby="lesson-notes-title">
      <h2 id="lesson-notes-title">Private notes</h2>
      <Textarea
        aria-label="Lesson note"
        onChange={(event) => setBody(event.target.value)}
        value={body}
      />
      <div className="delivery-note-actions">
        <Button
          disabled={pending || !body.trim()}
          onClick={() =>
            startTransition(async () => {
              const data = new FormData();
              data.set("body", body);
              data.set("courseSlug", courseSlug);
              data.set("lessonId", lessonId);
              data.set("lessonSlug", lessonSlug);
              data.set("noteId", notes[0]?.noteId ?? "");
              setResult(await saveLessonNote(data));
            })
          }
        >
          <Save />
          Save note
        </Button>
        {notes[0] ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const data = new FormData();
                data.set("courseSlug", courseSlug);
                data.set("lessonSlug", lessonSlug);
                data.set("noteId", notes[0]!.noteId);
                const next = await deleteLessonNote(data);
                setResult(next);
                if (next.success) setBody("");
              })
            }
            variant="danger"
          >
            <Trash2 />
            Delete
          </Button>
        ) : null}
      </div>
      <ProgressSyncIndicator pending={pending} result={result} />
    </section>
  );
}
