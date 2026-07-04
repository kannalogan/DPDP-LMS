"use client";

import { useMemo, useState } from "react";
import type { StudentCourse } from "@/features/student/types";
import { StudentCourseCard } from "@/features/student/components/student-cards";
import { StudentEmpty, StudentStatusLegend } from "@/features/student/components/workspace-ui";
import { SearchInput, Select } from "@/shared/ui/forms";

type View = "grid" | "list";

export function LearningLibrary({ courses }: { courses: StudentCourse[] }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<View>("grid");
  const categories = useMemo(
    () => Array.from(new Set(courses.flatMap((course) => course.category ?? []))).sort(),
    [courses]
  );
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return courses.filter(
      (course) =>
        (category === "all" || course.category === category) &&
        (status === "all" || course.status === status) &&
        (!normalized ||
          `${course.title} ${course.description}`.toLocaleLowerCase().includes(normalized))
    );
  }, [category, courses, query, status]);

  return (
    <div className="student-library">
      <div className="student-library-toolbar">
        <SearchInput
          aria-label="Search enrolled courses"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search my learning"
          value={query}
        />
        <Select
          aria-label="Filter by status"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="all">All statuses</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </Select>
        <Select
          aria-label="Filter by category"
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <div className="student-view-toggle" aria-label="Course view" role="group">
          <button aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button">
            Grid
          </button>
          <button aria-pressed={view === "list"} onClick={() => setView("list")} type="button">
            List
          </button>
        </div>
      </div>
      <StudentStatusLegend />
      {!filtered.length ? (
        <StudentEmpty
          description={
            courses.length
              ? "No courses match the selected filters."
              : "Assigned and self-enrolled courses will appear here."
          }
          title="No courses"
        />
      ) : (
        <div className={view === "grid" ? "student-card-grid" : "student-course-list"}>
          {filtered.map((course) => (
            <StudentCourseCard course={course} key={course.courseId} />
          ))}
        </div>
      )}
    </div>
  );
}
