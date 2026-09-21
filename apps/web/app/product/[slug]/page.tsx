// TODO: build from Figma frame 759:2979 "PDP_draft 2" (file
// 3HCgSRca91P6WCpW28RA9o). Desktop only in Figma so far, no mobile variant.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main>
      <h1>Product: {slug}</h1>
      <p>Product page — pending Figma build-out.</p>
    </main>
  );
}
