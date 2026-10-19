import { PageHeader } from "../../_components/ui";
import { requirePageSession } from "../../_lib/requirePageSession";
import { RoleForm } from "../../_components/RoleForm";

export default async function NewRolePage() {
  await requirePageSession("role:create");

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Add role"
        back={{ href: "/roles", label: "Roles" }}
        description="Pick what people with this role are allowed to do."
      />
      <RoleForm />
    </main>
  );
}
