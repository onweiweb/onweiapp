import { requirePageSession } from "../../_lib/requirePageSession";
import { CouponForm } from "../../_components/CouponForm";

export default async function NewCouponPage() {
  await requirePageSession("coupon:create");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold uppercase">
        Add coupon
      </h1>
      <CouponForm mode="create" />
    </main>
  );
}
