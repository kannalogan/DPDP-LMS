import { createOrganization } from "@/features/organizations/actions";
import { ServerActionForm } from "@/features/auth/components/server-action-form";

export function CreateOrganizationForm() {
  return (
    <ServerActionForm
      action={createOrganization}
      fields={[
        { label: "Organization name", name: "name", required: true },
        { label: "Workspace slug", name: "slug", placeholder: "acme-learning", required: true },
        { defaultValue: "IN", label: "Country code", name: "countryCode", required: true }
      ]}
      submitLabel="Create organization"
    />
  );
}
