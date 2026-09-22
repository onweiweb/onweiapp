import { requirePageSession } from "../../_lib/requirePageSession";
import { StaffUserForm } from "../../_components/StaffUserForm";

export default async function NewStaffPage() {
  await requirePageSession("staffUser:create");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Add staff
      </h1>
      <StaffUserForm />
    </main>
  );
}
