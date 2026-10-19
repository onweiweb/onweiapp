import { PageHeader } from "../../_components/ui";
import { requirePageSession } from "../../_lib/requirePageSession";
import { CouponForm } from "../../_components/CouponForm";

export default async function NewCouponPage() {
  await requirePageSession("coupon:create");

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="Add coupon"
        back={{ href: "/coupons", label: "Coupons" }}
      />
      <CouponForm mode="create" />
    </main>
  );
}
