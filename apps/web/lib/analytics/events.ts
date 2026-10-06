// Every analytics event the storefront can send, and exactly which details
// each one carries. Add a new event here first, so a typo fails typecheck.
// Never put anything a visitor typed (name, email, phone) in an event.
export interface AnalyticsEvents {
  scroll_depth: { depth: 25 | 50 | 75 | 100 };
  first_interaction: { ms: number; kind: "tap" | "key" | "scroll" };

  form_started: { form_name: string };
  field_focused: { form_name: string; field: string; field_index: number };
  field_completed: { form_name: string; field: string; field_index: number };
  field_error: {
    form_name: string;
    field: string;
    field_index: number;
    error: string;
  };
  submit_attempt: { form_name: string };
  submit_success: { form_name: string };
  submit_failed: { form_name: string; error: string };
  form_abandoned: { form_name: string; last_field: string };

  // Shop events. Defined now, sent by the pages that exist today.
  product_viewed: {
    product_id: string;
    product_slug: string;
    category_slug?: string;
  };
  variant_selected: { product_slug: string; variant_id: string };
  collection_viewed: { category_slug: string; product_count: number };
  collection_sorted: { category_slug: string; sort: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
