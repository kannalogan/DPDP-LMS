"use client";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui/button";
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("ui-card", className)}>{children}</section>;
}
export function Avatar({
  alt,
  fallback,
  size = "md",
  src
}: {
  alt: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  src?: string | null;
}) {
  return (
    <span aria-label={alt} className={cn("ui-avatar", `ui-avatar-${size}`)} role="img">
      {src ? (
        <Image alt={alt} height={96} src={src} unoptimized width={96} />
      ) : (
        <span>{fallback.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
export function Table<T>({
  caption,
  columns,
  emptyMessage = "No records",
  rows
}: {
  caption: string;
  columns: Array<{ key: string; header: string; render(row: T): ReactNode }>;
  emptyMessage?: string;
  rows: T[];
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function VirtualTable<T>({
  rowHeight = 48,
  visibleRows = 12,
  ...props
}: Parameters<typeof Table<T>>[0] & { rowHeight?: number; visibleRows?: number }) {
  return (
    <div className="ui-virtual-table" data-row-height={rowHeight} tabIndex={0}>
      <Table {...props} rows={props.rows.slice(0, visibleRows)} />
    </div>
  );
}
export function Timeline({
  items
}: {
  items: Array<{ content: ReactNode; time?: string; title: string }>;
}) {
  return (
    <ol className="ui-timeline">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <span aria-hidden="true" />
          <div>
            <div className="ui-timeline-title">
              <strong>{item.title}</strong>
              {item.time ? <time>{item.time}</time> : null}
            </div>
            {item.content}
          </div>
        </li>
      ))}
    </ol>
  );
}
export function Tabs({ items }: { items: Array<{ content: ReactNode; label: string }> }) {
  const [active, setActive] = useState(0);
  return (
    <div className="ui-tabs">
      <div role="tablist">
        {items.map((item, index) => (
          <button
            aria-selected={active === index}
            key={item.label}
            onClick={() => setActive(index)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{items[active]?.content}</div>
    </div>
  );
}
export function Accordion({ items }: { items: Array<{ content: ReactNode; title: string }> }) {
  return (
    <div className="ui-accordion">
      {items.map((item) => (
        <details key={item.title}>
          <summary>{item.title}</summary>
          <div>{item.content}</div>
        </details>
      ))}
    </div>
  );
}
export function Carousel({ items, label = "Carousel" }: { items: ReactNode[]; label?: string }) {
  const [active, setActive] = useState(0);
  return (
    <section aria-label={label} className="ui-carousel">
      <div>{items[active]}</div>
      <footer>
        <Button
          aria-label="Previous"
          disabled={active === 0}
          onClick={() => setActive((value) => value - 1)}
          size="icon"
          variant="secondary"
        >
          <ChevronLeft />
        </Button>
        <span>
          {active + 1} / {items.length}
        </span>
        <Button
          aria-label="Next"
          disabled={active >= items.length - 1}
          onClick={() => setActive((value) => value + 1)}
          size="icon"
          variant="secondary"
        >
          <ChevronRight />
        </Button>
      </footer>
    </section>
  );
}
export function Pagination({
  onChange,
  page,
  totalPages
}: {
  onChange(page: number): void;
  page: number;
  totalPages: number;
}) {
  return (
    <nav aria-label="Pagination" className="ui-pagination">
      <Button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        size="icon"
        variant="secondary"
      >
        <ChevronLeft />
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        size="icon"
        variant="secondary"
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
export function CodeBlock({ code, language = "text" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ui-code">
      <header>
        <span>{language}</span>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          }}
          size="sm"
          variant="ghost"
        >
          <Copy className="size-3" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </header>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="ui-markdown">
      {blocks.map((block, index) =>
        block.startsWith("# ") ? (
          <h1 key={index}>{block.slice(2)}</h1>
        ) : block.startsWith("## ") ? (
          <h2 key={index}>{block.slice(3)}</h2>
        ) : (
          <p key={index}>{block}</p>
        )
      )}
    </div>
  );
}
export function MetricCard({
  change,
  label,
  value
}: {
  change?: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="ui-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {change ? <small>{change}</small> : null}
    </Card>
  );
}
export function StatisticsCard({
  items,
  title
}: {
  items: Array<{ label: string; value: string }>;
  title: string;
}) {
  return (
    <Card>
      <h3>{title}</h3>
      <dl className="ui-statistics">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
export function Heatmap({
  columns,
  label,
  values
}: {
  columns: number;
  label: string;
  values: number[];
}) {
  return (
    <div aria-label={label} className="ui-heatmap" role="img">
      {values.map((value, index) => (
        <span
          className={`heat-${Math.max(0, Math.min(4, Math.round(value * 4)))}`}
          data-column={index % columns}
          key={index}
        />
      ))}
    </div>
  );
}
