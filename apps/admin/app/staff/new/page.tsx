import { PageHeader } from "../../_components/ui";
import { requirePageSession } from "../../_lib/requirePageSession";
import { StaffUserForm } from "../../_components/StaffUserForm";

export default async function NewStaffPage() {
  await requirePageSession("staffUser:create");

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Add staff"
        back={{ href: "/staff", label: "Staff" }}
        description="Create a login for a team member."
      />
      <StaffUserForm />
    </main>
  );
}
