import Link from "next/link";
import type { Route } from "next";
import type { StudentLearningSearchResult } from "@/features/student/types";
import { StudentEmpty } from "@/features/student/components/workspace-ui";
import { Button } from "@/shared/ui/button";
import { SearchInput } from "@/shared/ui/forms";
import { Badge } from "@/shared/ui/feedback";
import { Card } from "@/shared/ui/data-display";

export function StudentSearch({
  results,
  query
}: {
  results: StudentLearningSearchResult[];
  query: string;
}) {
  return (
    <div className="student-search-view">
      <form action="/student/search" className="student-search-form" method="get" role="search">
        <SearchInput
          aria-label="Search courses, lessons, resources, bookmarks, and certificates"
          defaultValue={query}
          minLength={2}
          name="q"
          placeholder="Search your learning"
        />
        <Button type="submit">Search</Button>
      </form>
      {!results.length ? (
        <StudentEmpty
          description={
            query
              ? "No authorized learning items match your search."
              : "Enter at least two characters to search the published catalog."
          }
          title="No results"
        />
      ) : (
        <div className="student-card-grid">
          {results.map((result) => (
            <Card className="student-search-result" key={`${result.type}-${result.resultId}`}>
              <div className="student-card-heading">
                <Badge>{result.type}</Badge>
              </div>
              <h2>{result.title}</h2>
              <p>{result.description}</p>
              {result.courseId ? (
                <Button asChild variant="secondary">
                  <Link href={`/student/learning?course=${result.courseId}` as Route}>
                    View in learning
                  </Link>
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
