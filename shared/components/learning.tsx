import { BookOpen, FileText, Lock, PlayCircle, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Progress, ProgressRing } from "@/shared/ui/feedback";
import { Card } from "@/shared/ui/data-display";
import { Button } from "@/shared/ui/button";
interface LearningCardProps {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  locked?: boolean;
  title: string;
}
function LearningCard({ action, description, eyebrow, locked, title }: LearningCardProps) {
  return (
    <Card className="learning-card">
      <div>
        {eyebrow ? <span className="card-eyebrow">{eyebrow}</span> : null}
        {locked ? <Lock aria-label="Locked" className="size-4" /> : null}
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </Card>
  );
}
export function CourseCard(props: LearningCardProps & { progress?: number }) {
  return (
    <LearningCard
      {...props}
      action={
        <div>
          {props.progress !== undefined ? (
            <Progress label="Course progress" value={props.progress} />
          ) : (
            props.action
          )}
        </div>
      }
    />
  );
}
export function LessonCard(props: LearningCardProps & { duration?: string }) {
  return (
    <LearningCard
      {...props}
      action={
        <div className="card-meta">
          <BookOpen />
          {props.duration}
          <span>{props.action}</span>
        </div>
      }
    />
  );
}
export function ModuleCard(props: LearningCardProps & { lessonCount: number }) {
  return <LearningCard {...props} eyebrow={`${props.lessonCount} lessons`} />;
}
export { ProgressRing };
export function LearningTimeline({
  items
}: {
  items: Array<{ complete: boolean; title: string }>;
}) {
  return (
    <ol className="learning-timeline">
      {items.map((item) => (
        <li className={item.complete ? "is-complete" : ""} key={item.title}>
          <span />
          {item.title}
        </li>
      ))}
    </ol>
  );
}
export function VideoContainer({
  poster,
  src,
  title
}: {
  poster?: string;
  src: string;
  title: string;
}) {
  return (
    <div className="video-container">
      <video controls playsInline poster={poster} preload="metadata" src={src}>
        <track kind="captions" />
      </video>
      <span className="sr-only">{title}</span>
    </div>
  );
}
export function ResourceCard({ href, title, type }: { href: string; title: string; type: string }) {
  return (
    <a className="resource-card" href={href}>
      <FileText />
      <span>
        <strong>{title}</strong>
        <small>{type}</small>
      </span>
    </a>
  );
}
export function QuizCard({
  description,
  onStart,
  title
}: {
  description: string;
  onStart(): void;
  title: string;
}) {
  return (
    <LearningCard
      action={
        <Button onClick={onStart}>
          <PlayCircle />
          Start
        </Button>
      }
      description={description}
      eyebrow="Assessment"
      title={title}
    />
  );
}
export function CertificateCard({
  credential,
  issuedAt,
  title
}: {
  credential: string;
  issuedAt: string;
  title: string;
}) {
  return (
    <LearningCard
      action={<Badge tone="success">Issued {issuedAt}</Badge>}
      description={credential}
      eyebrow="Certificate"
      title={title}
    />
  );
}
export function AchievementCard({ description, title }: { description: string; title: string }) {
  return (
    <LearningCard
      action={<Trophy aria-hidden="true" />}
      description={description}
      eyebrow="Achievement"
      title={title}
    />
  );
}
