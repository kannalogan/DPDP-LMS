import type { ReactNode } from "react";
import { Card } from "@/shared/ui/data-display";
export function ChartContainer({
  children,
  description,
  title
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card className="ui-chart">
      <header>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </Card>
  );
}
export function BarChart({
  data,
  label
}: {
  data: Array<{ label: string; value: number }>;
  label: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div aria-label={label} className="ui-bars" role="img">
      {data.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div>
            <i className={`bar-width-${Math.round((item.value / max) * 10)}`} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
export function Sparkline({ label, values }: { label: string; values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * 100},${30 - (value / max) * 28}`
    )
    .join(" ");
  return (
    <svg aria-label={label} className="ui-sparkline" role="img" viewBox="0 0 100 32">
      <polyline points={points} />
    </svg>
  );
}
