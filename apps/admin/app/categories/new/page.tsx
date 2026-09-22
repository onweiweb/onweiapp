import { CategoryForm } from "../../_components/CategoryForm";

export default function NewCategoryPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add a category</h1>
      <CategoryForm mode="create" />
    </main>
  );
}
