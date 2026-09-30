// Read-only storefront load test. Run against a preview or staging URL first,
// not production during trading hours.
//   k6 run -e BASE_URL=https://your-preview.vercel.app scripts/loadtest/storefront.k6.js
// Set PRODUCT_SLUG and COLLECTION_SLUG to real slugs. Never point at checkout
// or login routes (those send OTPs and write rows).
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
const PRODUCT = __ENV.PRODUCT_SLUG || "";
const COLLECTION = __ENV.COLLECTION_SLUG || "";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 300 },
    { duration: "2m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const paths = ["/", "/about", "/journal"];
  if (COLLECTION) paths.push(`/collection/${COLLECTION}`);
  if (PRODUCT) paths.push(`/product/${PRODUCT}`);
  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${BASE}${path}`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 3);
}
