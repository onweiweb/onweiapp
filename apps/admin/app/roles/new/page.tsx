import { requirePageSession } from "../../_lib/requirePageSession";
import { RoleForm } from "../../_components/RoleForm";

export default async function NewRolePage() {
  await requirePageSession("role:create");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Add role
      </h1>
      <RoleForm />
    </main>
  );
}
