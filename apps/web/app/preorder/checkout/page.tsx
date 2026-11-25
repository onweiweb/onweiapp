import { redirect } from "next/navigation";

// The one-product reserve page was retired (2026-11-27): pre-orders now go
// through the bag and checkout charges the reserve. Old links land there.
export default function PreorderCheckoutPage() {
  redirect("/checkout");
}
