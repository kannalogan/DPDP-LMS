import {
  BarChart3,
  Bookmark,
  BookOpen,
  Clock3,
  Compass,
  Filter,
  Gauge,
  History,
  Layers3,
  Pin,
  Search,
  Settings2,
  Sparkles,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import {
  deleteSavedSearch,
  openSearchResult,
  pinSavedSearch,
  recordRecommendationEvent,
  reindexModule,
  saveBoostRule,
  saveRecommendationRule,
  saveSearch,
  saveSynonym,
  unpinSavedSearch
} from "@/features/search/actions";
import { recentUniqueQueries } from "@/features/search/history-manager";
import { recommendationLabel } from "@/features/search/recommendation-engine";
import { orderedSavedSearches } from "@/features/search/saved-search-manager";
import { searchTotals, topTrending } from "@/features/search/selectors";
import type {
  RecentSearchItemDto,
  RecommendationDto,
  SavedSearchDto,
  SearchAnalyticsDto,
  SearchExecutionDto,
  SearchHistoryDto,
  SearchIndexStatusDto,
  SearchSuggestionDto,
  SearchWorkspaceDto,
  TrendingSearchItemDto
} from "@/features/search/types";
import { Button } from "@/shared/ui/button";
import { Card, Table } from "@/shared/ui/data-display";
import { Badge, EmptyState, ErrorState, LoadingState } from "@/shared/ui/feedback";
import { SearchInput, Select } from "@/shared/ui/forms";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import "@/features/search/search.css";
type FormAction = (data: FormData) => void | Promise<void>;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Not available";
const titleCase = (value: string) => value.replaceAll("_", " ");
export function SearchPageHeader({ description, title }: { description: string; title: string }) {
  return (
    <header className="search-header">
      <div>
        <span className="student-eyebrow">Search and discovery</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Search aria-hidden="true" />
    </header>
  );
}
export function GlobalSearchBar({
  defaultValue = "",
  scope = "all"
}: {
  defaultValue?: string;
  scope?: string;
}) {
  return (
    <form action="/search/results" className="search-global-bar" method="get" role="search">
      <SearchInput
        aria-label="Search the learning platform"
        autoComplete="off"
        defaultValue={defaultValue}
        minLength={2}
        name="q"
        placeholder="Search courses, assignments, reports, policies, and more"
        required
      />
      <Select aria-label="Content type" defaultValue={scope} name="type">
        <option value="all">All content</option>
        <option value="course">Courses</option>
        <option value="lesson">Lessons</option>
        <option value="assignment">Assignments</option>
        <option value="assessment">Assessments</option>
        <option value="certificate">Certificates</option>
        <option value="report">Reports</option>
        <option value="policy">Policies</option>
      </Select>
      <Button type="submit">
        <Search />
        Search
      </Button>
    </form>
  );
}
export function CommandPalette() {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Search} title="Command palette" />
      <GlobalSearchBar />
    </Card>
  );
}
export function SearchResults({
  execution,
  page = 1
}: {
  execution: SearchExecutionDto;
  page?: number;
}) {
  if (!execution.results.length)
    return (
      <SearchEmpty
        description={`No authorized content matches “${execution.query}”.`}
        title="No search results"
      />
    );
  return (
    <div className="search-results" aria-live="polite">
      {execution.results.map((result, index) => (
        <ResultCard
          historyId={execution.historyId}
          key={result.documentId}
          position={(page - 1) * 24 + index + 1}
          result={result}
        />
      ))}
    </div>
  );
}
export function ResultCard({
  historyId,
  position,
  result
}: {
  historyId: string | null;
  position: number;
  result: SearchExecutionDto["results"][number];
}) {
  return (
    <Card className="search-result-card">
      <div className="search-panel-heading">
        <Badge tone="info">{titleCase(result.entityType)}</Badge>
        <span className="search-rank">{result.rankScore.toFixed(2)}</span>
      </div>
      <h2>{result.title}</h2>
      <p>{result.safeSnippet}</p>
      <SearchChips
        chips={[result.category, ...result.tags].filter((item): item is string => Boolean(item))}
      />
      <footer>
        <span>Updated {formatDate(result.updatedAt)}</span>
        {historyId ? (
          <form action={openSearchResult as unknown as FormAction}>
            <input name="historyId" type="hidden" value={historyId} />
            <input name="documentId" type="hidden" value={result.documentId} />
            <input name="position" type="hidden" value={position} />
            <input name="routePath" type="hidden" value={result.routePath} />
            <Button size="sm" type="submit" variant="secondary">
              Open
            </Button>
          </form>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={result.routePath as Route}>Open</Link>
          </Button>
        )}
      </footer>
    </Card>
  );
}
export function FilterPanel({ selectedType = "all" }: { selectedType?: string }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Filter} title="Filters" />
      <form action="/search/results" className="search-form" method="get">
        <label>
          Query
          <Input name="q" required />
        </label>
        <label>
          Content type
          <Select defaultValue={selectedType} name="type">
            <option value="all">All</option>
            <option value="course">Course</option>
            <option value="lesson">Lesson</option>
            <option value="assignment">Assignment</option>
            <option value="assessment">Assessment</option>
            <option value="policy">Policy</option>
            <option value="report">Report</option>
          </Select>
        </label>
        <label>
          Status
          <Input name="status" />
        </label>
        <label>
          From date
          <Input name="from" type="date" />
        </label>
        <label>
          To date
          <Input name="to" type="date" />
        </label>
        <Button type="submit">Apply filters</Button>
      </form>
    </Card>
  );
}
export function SearchChips({ chips }: { chips: string[] }) {
  return chips.length ? (
    <div className="search-chips">
      {chips.map((chip) => (
        <Badge key={chip}>{chip}</Badge>
      ))}
    </div>
  ) : null;
}
export function SavedSearches({
  organizationId,
  saved
}: {
  organizationId: string;
  saved: SavedSearchDto[];
}) {
  const items = orderedSavedSearches(saved);
  return (
    <div className="search-grid">
      <Card className="search-panel">
        <PanelTitle icon={Bookmark} title="Save this search" />
        <form action={saveSearch as unknown as FormAction} className="search-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="filters" type="hidden" value="{}" />
          <label>
            Name
            <Input name="name" required />
          </label>
          <label>
            Query
            <Input minLength={2} name="query" required />
          </label>
          <label>
            Sort
            <Select defaultValue="relevance" name="sort">
              <option value="relevance">Relevance</option>
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
              <option value="title">Title</option>
            </Select>
          </label>
          <Button type="submit">
            <Bookmark />
            Save search
          </Button>
        </form>
      </Card>
      <Card className="search-panel search-panel-wide">
        <PanelTitle icon={Pin} title="Saved searches" />
        {items.length ? (
          <div className="search-list">
            {items.map((item) => (
              <article className="search-list-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.query} · {item.sort}
                  </p>
                </div>
                <div className="search-actions">
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={
                        `/search/results?q=${encodeURIComponent(item.query)}&sort=${item.sort}` as Route
                      }
                    >
                      Run
                    </Link>
                  </Button>
                  <SavedSearchAction
                    action={item.pinned ? unpinSavedSearch : pinSavedSearch}
                    id={item.id}
                    label={item.pinned ? "Unpin" : "Pin"}
                  />
                  <SavedSearchAction action={deleteSavedSearch} id={item.id} label="Archive" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <SearchEmpty title="No saved searches" />
        )}
      </Card>
    </div>
  );
}
function SavedSearchAction({
  action,
  id,
  label
}: {
  action(data: FormData): Promise<unknown>;
  id: string;
  label: string;
}) {
  return (
    <form action={action as FormAction}>
      <input name="savedSearchId" type="hidden" value={id} />
      <Button size="sm" type="submit" variant="ghost">
        {label}
      </Button>
    </form>
  );
}
export function RecentSearches({ history }: { history: SearchHistoryDto[] }) {
  const items = recentUniqueQueries(history);
  return (
    <Card className="search-panel">
      <PanelTitle icon={Clock3} title="Recent searches" />
      {items.length ? (
        <div className="search-link-list">
          {items.map((item) => (
            <Link
              href={`/search/results?q=${encodeURIComponent(item.query)}` as Route}
              key={item.id}
            >
              <Search />
              <span>{item.query}</span>
              <small>{item.resultCount} results</small>
            </Link>
          ))}
        </div>
      ) : (
        <SearchEmpty title="No recent searches" />
      )}
    </Card>
  );
}
export function SearchHistory({ history }: { history: SearchHistoryDto[] }) {
  return (
    <Card className="search-panel search-panel-wide">
      <PanelTitle icon={History} title="Search history" />
      {history.length ? (
        <Table
          caption="Private search history"
          columns={[
            { key: "query", header: "Query", render: (row) => row.query },
            { key: "results", header: "Results", render: (row) => row.resultCount },
            {
              key: "latency",
              header: "Latency",
              render: (row) => (row.latencyMs == null ? "Not recorded" : `${row.latencyMs} ms`)
            },
            { key: "date", header: "Searched", render: (row) => formatDate(row.searchedAt) }
          ]}
          rows={history}
        />
      ) : (
        <SearchEmpty title="No search history" />
      )}
    </Card>
  );
}
export function RecommendationCards({ recommendations }: { recommendations: RecommendationDto[] }) {
  if (!recommendations.length) return <SearchEmpty title="No recommendations yet" />;
  return (
    <div className="search-results">
      {recommendations.map((item) => (
        <Card className="search-result-card" key={item.id}>
          <div className="search-panel-heading">
            <Badge tone="success">{recommendationLabel(item.recommendationType)}</Badge>
            <span className="search-rank">{item.score.toFixed(1)}</span>
          </div>
          <h2>{item.title}</h2>
          <p>{item.summary}</p>
          <small>{titleCase(item.reasonKey)}</small>
          <div className="search-actions">
            <form action={recordRecommendationEvent as unknown as FormAction}>
              <input name="recommendationId" type="hidden" value={item.id} />
              <input name="eventType" type="hidden" value="opened" />
              <input name="routePath" type="hidden" value={item.routePath} />
              <Button size="sm" type="submit">
                Open
              </Button>
            </form>
            <form action={recordRecommendationEvent as unknown as FormAction}>
              <input name="recommendationId" type="hidden" value={item.id} />
              <input name="eventType" type="hidden" value="dismissed" />
              <Button size="sm" type="submit" variant="ghost">
                Dismiss
              </Button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
export function TrendingPanel({ items }: { items: TrendingSearchItemDto[] }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={TrendingUp} title="Trending" />
      <PopularContent items={topTrending(items)} />
    </Card>
  );
}
export function PopularContent({ items }: { items: TrendingSearchItemDto[] }) {
  return items.length ? (
    <div className="search-link-list">
      {items.map((item) => (
        <Link href={item.routePath as Route} key={item.documentId}>
          <TrendingUp />
          <span>{item.title}</span>
          <small>{item.popularityScore.toFixed(1)}</small>
        </Link>
      ))}
    </div>
  ) : (
    <SearchEmpty title="No trending content" />
  );
}
export function RecentlyViewed({ items }: { items: RecentSearchItemDto[] }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Clock3} title="Recently viewed" />
      {items.length ? (
        <div className="search-link-list">
          {items.map((item) => (
            <Link href={item.routePath as Route} key={item.id}>
              <Clock3 />
              <span>{item.title}</span>
              <small>{item.interactionCount} interactions</small>
            </Link>
          ))}
        </div>
      ) : (
        <SearchEmpty title="No recently viewed content" />
      )}
    </Card>
  );
}
export function ContinueLearning({ recommendations }: { recommendations: RecommendationDto[] }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={BookOpen} title="Continue learning" />
      <RecommendationCards
        recommendations={recommendations.filter(
          (item) => item.recommendationType === "continue_learning"
        )}
      />
    </Card>
  );
}
export function Autocomplete({ suggestions }: { suggestions: SearchSuggestionDto[] }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Sparkles} title="Autocomplete" />
      <SuggestionDropdown suggestions={suggestions} />
    </Card>
  );
}
export function SuggestionDropdown({ suggestions }: { suggestions: SearchSuggestionDto[] }) {
  return suggestions.length ? (
    <div className="search-link-list" role="listbox">
      {suggestions.map((item) => (
        <Link
          href={
            (item.routePath ?? `/search/results?q=${encodeURIComponent(item.suggestion)}`) as Route
          }
          key={`${item.suggestionType}-${item.suggestion}`}
          role="option"
        >
          <Search />
          <span>{item.suggestion}</span>
          <small>{item.suggestionType}</small>
        </Link>
      ))}
    </div>
  ) : (
    <SearchEmpty title="No suggestions" />
  );
}
export function AdvancedFilterBuilder() {
  return <FilterPanel />;
}
export function RankingPreview({ organizationId }: { organizationId: string }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Gauge} title="Ranking preview" />
      <form action={saveBoostRule as unknown as FormAction} className="search-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Rule name
          <Input name="name" required />
        </label>
        <label>
          Content type
          <Input name="entityType" />
        </label>
        <label>
          Boost
          <Input defaultValue="1" max="20" min="0" name="boost" step="0.1" type="number" />
        </label>
        <Button type="submit">Save boost rule</Button>
      </form>
    </Card>
  );
}
export function SearchAnalytics({ analytics }: { analytics: SearchAnalyticsDto[] }) {
  const totals = searchTotals(analytics);
  return (
    <div className="search-workspace">
      <div className="search-metrics">
        <Metric label="Search volume" value={totals.searches} />
        <Metric label="Clicks" value={totals.clicks} />
        <Metric label="No results" value={totals.noResults} />
      </div>
      <Card className="search-panel search-panel-wide">
        <Table
          caption="Search analytics"
          columns={[
            { key: "date", header: "Date", render: (row) => formatDate(row.activityDay) },
            { key: "volume", header: "Searches", render: (row) => row.searchVolume },
            {
              key: "ctr",
              header: "CTR",
              render: (row) => `${(row.clickThroughRate * 100).toFixed(1)}%`
            },
            {
              key: "latency",
              header: "Latency",
              render: (row) => `${row.averageLatencyMs.toFixed(0)} ms`
            }
          ]}
          rows={analytics}
        />
      </Card>
    </div>
  );
}
export function IndexStatus({
  indexes,
  organizationId
}: {
  indexes: SearchIndexStatusDto[];
  organizationId: string;
}) {
  return (
    <div className="search-grid">
      <Card className="search-panel">
        <PanelTitle icon={Layers3} title="Reindex module" />
        <form action={reindexModule as unknown as FormAction} className="search-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Module key
            <Input name="moduleKey" pattern="[a-z][a-z0-9_.-]*" required />
          </label>
          <Button type="submit">Create index version</Button>
        </form>
      </Card>
      <Card className="search-panel search-panel-wide">
        <PanelTitle icon={Layers3} title="Index status" />
        {indexes.length ? (
          <Table
            caption="Search indexes"
            columns={[
              { key: "module", header: "Module", render: (row) => row.name },
              { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
              { key: "version", header: "Version", render: (row) => row.version ?? "None" },
              { key: "documents", header: "Documents", render: (row) => row.documentCount },
              {
                key: "watermark",
                header: "Watermark",
                render: (row) => formatDate(row.sourceWatermark)
              }
            ]}
            rows={indexes}
          />
        ) : (
          <SearchEmpty title="No search indexes" />
        )}
      </Card>
    </div>
  );
}
export function SearchDashboard({ data }: { data: SearchWorkspaceDto }) {
  return (
    <div className="search-workspace">
      <div className="search-grid">
        <CommandPalette />
        <RecentSearches history={data.history} />
        <TrendingPanel items={data.trending} />
        <RecentlyViewed items={data.recent} />
      </div>
      <RecommendationCards recommendations={data.recommendations} />
    </div>
  );
}
export function SynonymManager({ organizationId }: { organizationId: string }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Settings2} title="Synonyms" />
      <form action={saveSynonym as unknown as FormAction} className="search-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Term
          <Input name="term" required />
        </label>
        <label>
          Synonyms
          <Input name="synonyms" placeholder="comma, separated, terms" required />
        </label>
        <label>
          Locale
          <Input defaultValue="en-IN" name="locale" required />
        </label>
        <Button type="submit">Save synonym</Button>
      </form>
    </Card>
  );
}
export function RecommendationRuleManager({ organizationId }: { organizationId: string }) {
  return (
    <Card className="search-panel">
      <PanelTitle icon={Compass} title="Recommendation rules" />
      <form action={saveRecommendationRule as unknown as FormAction} className="search-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <label>
          Key
          <Input name="key" pattern="[a-z][a-z0-9_.-]*" required />
        </label>
        <label>
          Name
          <Input name="name" required />
        </label>
        <label>
          Type
          <Select name="recommendationType">
            <option value="continue_learning">Continue learning</option>
            <option value="pending_assignment">Pending assignment</option>
            <option value="upcoming_assessment">Upcoming assessment</option>
            <option value="popular_learning">Popular learning</option>
            <option value="role_based">Role based</option>
            <option value="organization">Organization</option>
          </Select>
        </label>
        <label>
          Priority
          <Input defaultValue="100" max="1000" min="1" name="priority" type="number" />
        </label>
        <Button type="submit">Save rule</Button>
      </form>
    </Card>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="search-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <BarChart3 />
    </Card>
  );
}
function PanelTitle({ icon: Icon, title }: { icon: typeof Search; title: string }) {
  return (
    <div className="search-panel-heading">
      <h2>{title}</h2>
      <Icon aria-hidden="true" />
    </div>
  );
}
export function SearchEmpty({
  description = "Authorized content will appear when its source is indexed.",
  title = "Nothing to show"
}: {
  description?: string;
  title?: string;
}) {
  return <EmptyState description={description} title={title} />;
}
export function SearchLoading() {
  return <LoadingState label="Loading search workspace" />;
}
export function SearchSkeleton() {
  return (
    <div aria-label="Loading search results" className="search-results">
      <Skeleton className="search-skeleton" />
      <Skeleton className="search-skeleton" />
      <Skeleton className="search-skeleton" />
    </div>
  );
}
export function SearchError() {
  return (
    <ErrorState
      description="The search workspace could not be loaded. Direct authorized navigation remains available."
      title="Search unavailable"
    />
  );
}
export function SearchPermissionDenied() {
  return (
    <ErrorState
      description="Your active organization role does not grant access to this search workspace."
      title="Permission denied"
    />
  );
}
