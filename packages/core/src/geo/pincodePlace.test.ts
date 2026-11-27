import { describe, expect, it } from "vitest";
import { placeFromCouriers, toIndianState } from "./pincodePlace";

// Real iThink PIN check replies (staging, 2026-11-27), trimmed.
const hyderabad = {
  xpressbees: { district: "TELANGANA", state_code: "TELANGANA" },
  fedex: { district: "TS", state_code: "TS", sort_code: "HYDERABAD" },
  delhivery: { district: "K.V.Rangareddy", state_code: "TS" },
  aramex: { district: "Andhra Pradesh", state_code: "Andhra Pradesh" },
  ecom: { district: "Telangana", state_code: "Telangana" },
};
const mumbai = {
  xpressbees: { district: "MAHARASHTRA", state_code: "MAHARASHTRA" },
  fedex: { district: "MH", state_code: "MH", sort_code: "MUMBAI" },
  delhivery: { district: "Mumbai", state_code: "MH" },
};

describe("placeFromCouriers", () => {
  it("reads city and state from iThink's reply", () => {
    expect(placeFromCouriers(hyderabad)).toEqual({
      city: "Hyderabad",
      state: "Telangana",
    });
    expect(placeFromCouriers(mumbai)).toEqual({
      city: "Mumbai",
      state: "Maharashtra",
    });
  });

  it("uses Delhivery's district when there is no FedEx entry", () => {
    expect(
      placeFromCouriers({
        delhivery: { district: "New Delhi", state_code: "DL" },
      }),
    ).toEqual({ city: "New Delhi", state: "Delhi" });
  });

  it("never treats a state as the city, and gives nothing it can't read", () => {
    expect(
      placeFromCouriers({
        xpressbees: { district: "KARNATAKA", state_code: "KARNATAKA" },
      }),
    ).toEqual({ city: null, state: "Karnataka" });
    expect(placeFromCouriers({})).toEqual({ city: null, state: null });
    expect(
      placeFromCouriers({ delhivery: { district: "123", state_code: "ZZ" } }),
    ).toEqual({ city: null, state: null });
  });
});

describe("toIndianState", () => {
  it("matches names, codes and old spellings to the form's names", () => {
    expect(toIndianState("tamil nadu")).toBe("Tamil Nadu");
    expect(toIndianState("TG")).toBe("Telangana");
    expect(toIndianState("Orissa")).toBe("Odisha");
    expect(toIndianState("JAMMU & KASHMIR")).toBe("Jammu and Kashmir");
    expect(toIndianState("Nowhere")).toBeNull();
  });
});
