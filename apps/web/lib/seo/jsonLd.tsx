// Renders a <script type="application/ld+json"> block. Escaping "<" (not
// just "</script>") covers any "<!--" sequence too, both of which can break
// out of the script tag if the serialized data ever contains raw user-
// authored text (a product description, an article body) rather than only
// admin-curated values.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"

      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
