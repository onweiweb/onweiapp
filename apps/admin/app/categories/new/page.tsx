import { PageHeader } from "../../_components/ui";
import { CategoryForm } from "../../_components/CategoryForm";

export default function NewCategoryPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Add a category"
        back={{ href: "/categories", label: "Categories" }}
      />
      <CategoryForm mode="create" />
    </main>
  );
}
