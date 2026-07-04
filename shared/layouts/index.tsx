import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
function Layout({
  aside,
  children,
  className,
  header
}: {
  aside?: ReactNode;
  children: ReactNode;
  className: string;
  header?: ReactNode;
}) {
  return (
    <div className={cn("layout-template", className)}>
      {header ? <header>{header}</header> : null}
      <div className="layout-body">
        <div>{children}</div>
        {aside ? <aside>{aside}</aside> : null}
      </div>
    </div>
  );
}
export function DashboardLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-dashboard" {...props} />;
}
export function ContentLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-content" {...props} />;
}
export function SettingsLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-settings" {...props} />;
}
export function WizardLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-wizard" {...props} />;
}
export function AuthenticationLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-authentication" {...props} />;
}
export function LearningLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-learning" {...props} />;
}
export function AssessmentLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-assessment" {...props} />;
}
export function CertificateLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-certificate" {...props} />;
}
export function AnalyticsLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-analytics" {...props} />;
}
export function ProfileLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-profile" {...props} />;
}
export function OrganizationLayout(props: Omit<Parameters<typeof Layout>[0], "className">) {
  return <Layout className="layout-organization" {...props} />;
}
