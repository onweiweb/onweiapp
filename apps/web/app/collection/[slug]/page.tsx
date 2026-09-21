// TODO: build from Figma frame 760:3829 "Collection" (file
// 3HCgSRca91P6WCpW28RA9o). Desktop only in Figma so far, no mobile variant.
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main>
      <h1>Collection: {slug}</h1>
      <p>Collection page — pending Figma build-out.</p>
    </main>
  );
}
