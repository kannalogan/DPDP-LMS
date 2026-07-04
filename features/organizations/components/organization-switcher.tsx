"use client";

import { useTransition } from "react";
import { switchOrganization } from "@/features/organizations/actions";
import type { OrganizationSummary } from "@/types/identity";

export function OrganizationSwitcher({
  currentId,
  organizations
}: {
  currentId: string | null;
  organizations: OrganizationSummary[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="identity-field compact-field">
      <span>Organization</span>
      <select
        aria-label="Active organization"
        className="identity-select"
        disabled={pending}
        onChange={(event) => {
          const data = new FormData();
          data.set("organizationId", event.target.value);
          startTransition(async () => {
            await switchOrganization(data);
            window.location.reload();
          });
        }}
        value={currentId ?? ""}
      >
        <option disabled value="">
          Select organization
        </option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
