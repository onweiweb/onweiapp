// Starting text for the Privacy Policy and Terms pages. Staff edit every
// point from the admin (Content > Legal pages), this is only what gets
// created the first time. Text in [square brackets] is a placeholder that
// must be replaced before launch. Have a lawyer review all of it.

export type LegalSlug = "privacy" | "terms";

export interface DefaultLegalSection {
  heading: string;
  body: string;
}

export interface DefaultLegalPage {
  slug: LegalSlug;
  title: string;
  intro: string;
  sections: DefaultLegalSection[];
}

export const LEGAL_SLUGS: readonly LegalSlug[] = ["privacy", "terms"];

const PRIVACY: DefaultLegalPage = {
  slug: "privacy",
  title: "Privacy Policy",
  intro:
    "This policy explains what personal information Onwei collects, why we collect it, and the choices you have. We keep it short and plain on purpose.",
  sections: [
    {
      heading: "Who we are",
      body: 'Onwei (KYROFIT PRIVATE LIMITED) sells sports and fitness accessories at onwei.in. Our registered address is Bangalore, India. In this policy, "we", "us" and "Onwei" mean that business.',
    },
    {
      heading: "What we collect",
      body: "We only collect what we need to run the site and serve you.\n- Your name, email address and phone number when you join the Insiders list or log in.\n- A one-time password (OTP) sent to your phone or email so you can log in. We do not store your OTP after it expires.\n- Delivery addresses and order details when you place an order.\n- Reviews you choose to submit.\n- Basic device and usage information, such as browser type and pages visited, to keep the site working and understand what is popular.",
    },
    {
      heading: "Why we use it",
      body: "We use your information to:\n- Let you log in and manage your account.\n- Process, deliver and support your orders, returns and refunds.\n- Send you updates you asked for, such as Insiders news and launch alerts.\n- Keep the site secure and prevent misuse.\n- Improve our products and the website.\nWe do not sell your personal information.",
    },
    {
      heading: "Your consent",
      body: "When you join the Insiders list or create an account, you agree to us using your details as described here. You can withdraw that consent at any time by writing to admin@onwei.in. Withdrawing consent will not affect anything we did before you withdrew, and some features may stop working.",
    },
    {
      heading: "Marketing messages",
      body: "We send marketing emails only if you opted in. Every marketing email has an unsubscribe link. Order and account messages, such as OTPs and delivery updates, are not marketing and will still be sent.",
    },
    {
      heading: "Cookies",
      body: "We use a small number of cookies and similar tools to keep you logged in, remember basic preferences and measure site performance. You can block cookies in your browser settings, but parts of the site may not work properly.",
    },
    {
      heading: "Who we share it with",
      body: "We share information only with services that help us run Onwei, and only what they need. These include:\n- Hosting and database providers.\n- Email and SMS providers that deliver our messages.\n- Payment and delivery partners, once ordering is available.\nWe may also share information if the law requires it. These providers may process data outside India.",
    },
    {
      heading: "How long we keep it",
      body: "We keep your information only as long as we need it for the purposes above, or as the law requires, for example for tax and accounting records. After that we delete it or make it anonymous.",
    },
    {
      heading: "How we protect it",
      body: "We use reasonable security measures, including encrypted connections and restricted staff access. No system is completely secure, so we cannot promise absolute security, but we take care of your information as if it were our own.",
    },
    {
      heading: "Your rights",
      body: "Under the Digital Personal Data Protection Act, 2023, you can:\n- Ask what personal information we hold about you.\n- Ask us to correct or complete it.\n- Ask us to erase it.\n- Nominate someone to exercise these rights for you.\n- Raise a complaint about how we handle your data.\nTo do any of this, email admin@onwei.in. We will respond within a reasonable time.",
    },
    {
      heading: "Children",
      body: "Onwei is not meant for children under 18. We do not knowingly collect information from children. If you think a child has given us their information, email admin@onwei.in and we will delete it.",
    },
    {
      heading: "Changes to this policy",
      body: "We may update this policy from time to time. When we do, we will change the date of the update on this page. If a change is important, we will tell you by email or on the site.",
    },
    {
      heading: "Contact and complaints",
      body: "Questions or complaints about your privacy? Email admin@onwei.in. Our grievance officer is [Grievance officer name], reachable at the same address.",
    },
  ],
};

const TERMS: DefaultLegalPage = {
  slug: "terms",
  title: "Terms and Conditions",
  intro:
    "These terms apply when you visit onwei.in or buy from Onwei. By using the site you agree to them, so please read them.",
  sections: [
    {
      heading: "About these terms",
      body: "The website is run by Onwei (KYROFIT PRIVATE LIMITED), Bangalore, India. If you do not agree with these terms, please do not use the site.",
    },
    {
      heading: "Your account",
      body: "You log in with a one-time password sent to your phone or email. Keep your login details to yourself and tell us straight away at admin@onwei.in if you think someone else has used your account. You must give accurate information and be at least 18 years old, or use the site with a parent or guardian.",
    },
    {
      heading: "Products and prices",
      body: "We try to show our products, photos and prices accurately. Colours may look slightly different on your screen. Prices are in Indian rupees. If we spot a pricing or stock error, we may correct it or cancel an affected order and refund you in full.",
    },
    {
      heading: "Orders and payment",
      body: "An order is confirmed only when we accept it and send you a confirmation. We may decline or cancel an order, for example if an item is out of stock or we suspect misuse. Accepted payment methods and any taxes are shown at checkout.",
    },
    {
      heading: "Shipping and delivery",
      body: "Delivery times shown at checkout are estimates, not guarantees. Delays caused by couriers, weather or other things outside our control are not our fault. Risk in the product passes to you when it is delivered.",
    },
    {
      heading: "Returns and refunds",
      body: "If something is wrong with your order, tell us at admin@onwei.in within [number of days] days of delivery. To be eligible for a return, the item must be unused and in its original packaging. Once we approve a return, we refund the amount you paid to your original payment method.",
    },
    {
      heading: "Coupons and offers",
      body: "Coupons and offers have their own conditions, such as an expiry date or minimum order value. Each coupon can be used only as described, cannot be exchanged for cash, and we may withdraw an offer at any time.",
    },
    {
      heading: "Reviews",
      body: "If you post a review, it must be honest and about a product you actually used. Do not post anything abusive, misleading or unlawful. We may remove reviews that break these rules, and by posting you let us display your review on our site.",
    },
    {
      heading: "Our content",
      body: "Everything on this site, including the Onwei name, logo, photos, text and designs, belongs to Onwei or its licensors. You may not copy or use it for commercial purposes without our written permission.",
    },
    {
      heading: "What you must not do",
      body: "Do not:\n- Use the site for anything unlawful.\n- Try to break into the site or interfere with how it works.\n- Use automated tools to collect information from it.\n- Pretend to be someone else.",
    },
    {
      heading: "Our responsibility",
      body: "We take care to keep the site available and accurate, but we provide it as it is. To the extent the law allows, Onwei is not responsible for indirect or consequential losses, and our total responsibility for any order is limited to the amount you paid for it. Nothing here limits rights you have under Indian consumer law.",
    },
    {
      heading: "Governing law",
      body: "These terms are governed by the laws of India. Courts in Bangalore will have jurisdiction over any dispute, subject to any consumer rights that allow you to bring a claim elsewhere.",
    },
    {
      heading: "Changes to these terms",
      body: "We may update these terms from time to time. The version on this page is the one that applies when you use the site.",
    },
    {
      heading: "Contact us",
      body: "Questions about these terms? Email admin@onwei.in.",
    },
  ],
};

export const DEFAULT_LEGAL_PAGES: readonly DefaultLegalPage[] = [
  PRIVACY,
  TERMS,
];
