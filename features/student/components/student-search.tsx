"use client";

import { useMemo, useState } from "react";
import type { StudentBookmark, StudentCertificate, StudentCourse } from "@/features/student/types";
import { SearchInput } from "@/shared/ui/forms";
import { StudentCourseCard } from "@/features/student/components/student-cards";
import { StudentEmpty } from "@/features/student/components/workspace-ui";

export function StudentSearch({
  bookmarks,
  certificates,
  courses
}: {
  bookmarks: StudentBookmark[];
  certificates: StudentCertificate[];
  courses: StudentCourse[];
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const results = useMemo(
    () => ({
      bookmarks: bookmarks.filter((item) => item.label.toLocaleLowerCase().includes(normalized)),
      certificates: certificates.filter((item) =>
        item.courseTitle.toLocaleLowerCase().includes(normalized)
      ),
      courses: courses.filter((item) =>
        `${item.title} ${item.description}`.toLocaleLowerCase().includes(normalized)
      )
    }),
    [bookmarks, certificates, courses, normalized]
  );
  const count = results.bookmarks.length + results.certificates.length + results.courses.length;

  return (
    <div className="student-search-view">
      <SearchInput
        aria-label="Search courses, lessons, resources, bookmarks, and certificates"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your learning"
        value={query}
      />
      {!count ? (
        <StudentEmpty
          description={
            normalized
              ? "No learning items match your search."
              : "Your searchable learning library is empty."
          }
          title="No results"
        />
      ) : (
        <div className="student-card-grid">
          {results.courses.map((course) => (
            <StudentCourseCard course={course} key={course.courseId} />
          ))}
        </div>
      )}
    </div>
  );
}
