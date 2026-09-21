import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import base from "./base.js";

// eslint-config-next ships a native flat-config array as of the version
// pinned here — no FlatCompat/eslintrc bridging needed (and that bridging
// path crashes under ESLint 10 with a circular-JSON error from the
// react plugin's config object).
export default [...base, ...nextCoreWebVitals];
