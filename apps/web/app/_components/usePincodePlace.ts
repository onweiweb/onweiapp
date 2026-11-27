"use client";

import { useEffect, useRef } from "react";

export interface PincodePlace {
  city: string | null;
  state: string | null;
}

/**
 * Looks up the city and state for a 6-digit PIN (iThink, through
 * /api/checkout/pincode) and hands them to `onPlace`. Forms fill only empty
 * fields with it, so nothing the shopper typed is overwritten. A failed or
 * unknown lookup does nothing.
 */
export function usePincodePlace(
  pin: string,
  onPlace: (place: PincodePlace) => void,
): void {
  const handler = useRef(onPlace);
  useEffect(() => {
    handler.current = onPlace;
  });

  useEffect(() => {
    const value = pin.replace(/\s/g, "");
    if (!/^[1-9]\d{5}$/.test(value)) return;
    const controller = new AbortController();
    fetch(`/api/checkout/pincode?pin=${value}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            known?: boolean;
            city?: string | null;
            state?: string | null;
          } | null,
        ) => {
          if (!data?.known) return;
          if (!data.city && !data.state) return;
          handler.current({
            city: data.city ?? null,
            state: data.state ?? null,
          });
        },
      )
      .catch(() => {});
    return () => controller.abort();
  }, [pin]);
}

/** Fills only the empty city and state fields. */
export function fillEmpty<T extends { city: string; state: string }>(
  values: T,
  place: PincodePlace,
  states: readonly string[],
): T {
  const state =
    !values.state && place.state && states.includes(place.state)
      ? place.state
      : values.state;
  const city = !values.city.trim() && place.city ? place.city : values.city;
  return city === values.city && state === values.state
    ? values
    : { ...values, city, state };
}
