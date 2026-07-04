import { Activity, Building2, CreditCard, ShieldCheck, Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import { Card, Table, Timeline } from "@/shared/ui/data-display";
import { Badge, Progress } from "@/shared/ui/feedback";
export function AuditTable<T>({
  rows,
  columns
}: {
  rows: T[];
  columns: Parameters<typeof Table<T>>[0]["columns"];
}) {
  return (
    <Table
      caption="Audit activity"
      columns={columns}
      emptyMessage="No audit events in this scope."
      rows={rows}
    />
  );
}
export function PermissionMatrix({
  permissions,
  roles
}: {
  permissions: string[];
  roles: Array<{ grants: string[]; name: string }>;
}) {
  return (
    <div className="permission-matrix">
      <table>
        <caption>Role permission matrix</caption>
        <thead>
          <tr>
            <th scope="col">Permission</th>
            {roles.map((role) => (
              <th key={role.name} scope="col">
                {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission}>
              <th scope="row">{permission}</th>
              {roles.map((role) => (
                <td key={role.name}>
                  {role.grants.includes(permission) ? (
                    <ShieldCheck aria-label="Granted" />
                  ) : (
                    <span aria-label="Not granted">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EnterpriseCard({
  children,
  icon: Icon,
  title
}: {
  children: ReactNode;
  icon: typeof Building2;
  title: string;
}) {
  return (
    <Card className="enterprise-card">
      <header>
        <Icon />
        <h3>{title}</h3>
      </header>
      {children}
    </Card>
  );
}
export function OrganizationCard({
  memberCount,
  name,
  status
}: {
  memberCount: number;
  name: string;
  status: string;
}) {
  return (
    <EnterpriseCard icon={Building2} title={name}>
      <p>{memberCount} members</p>
      <Badge tone={status === "active" ? "success" : "neutral"}>{status}</Badge>
    </EnterpriseCard>
  );
}
export function BillingCard({ amount, due }: { amount: string; due: string }) {
  return (
    <EnterpriseCard icon={CreditCard} title="Billing">
      <strong>{amount}</strong>
      <p>Due {due}</p>
    </EnterpriseCard>
  );
}
export function SubscriptionCard({
  plan,
  renewal,
  status
}: {
  plan: string;
  renewal: string;
  status: string;
}) {
  return (
    <EnterpriseCard icon={CreditCard} title={plan}>
      <Badge tone="success">{status}</Badge>
      <p>Renews {renewal}</p>
    </EnterpriseCard>
  );
}
export function UsageCard({
  label,
  limit,
  value
}: {
  label: string;
  limit: number;
  value: number;
}) {
  return (
    <EnterpriseCard icon={Waypoints} title={label}>
      <Progress label={label} value={(value / Math.max(limit, 1)) * 100} />
      <p>
        {value} of {limit}
      </p>
    </EnterpriseCard>
  );
}
export function ActivityFeed({ items }: { items: Parameters<typeof Timeline>[0]["items"] }) {
  return <Timeline items={items} />;
}
export function SystemHealthCard({
  checks
}: {
  checks: Array<{ label: string; status: "healthy" | "degraded" | "unavailable" }>;
}) {
  return (
    <EnterpriseCard icon={Activity} title="System health">
      <ul className="health-list">
        {checks.map((check) => (
          <li key={check.label}>
            <span>{check.label}</span>
            <Badge
              tone={
                check.status === "healthy"
                  ? "success"
                  : check.status === "degraded"
                    ? "warning"
                    : "danger"
              }
            >
              {check.status}
            </Badge>
          </li>
        ))}
      </ul>
    </EnterpriseCard>
  );
}
