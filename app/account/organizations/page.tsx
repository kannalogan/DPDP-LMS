import { CreateOrganizationForm } from "@/features/organizations/components/create-organization-form";
import { listOrganizations } from "@/features/organizations/server";

export default async function OrganizationsPage() {
  const organizations = await listOrganizations();
  return (
    <section className="account-section" aria-labelledby="organizations-title">
      <div>
        <p className="identity-eyebrow">Tenant access</p>
        <h1 id="organizations-title">Organizations</h1>
        <p>Your active memberships are resolved from the database on every request.</p>
        <ul className="organization-list">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <strong>{organization.name}</strong>
              <span>{organization.slug}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="account-form">
        <h2>Create an organization</h2>
        <CreateOrganizationForm />
      </div>
    </section>
  );
}
