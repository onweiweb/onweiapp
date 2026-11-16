/**
 * Reads the video id out of a YouTube link staff paste in admin Settings
 * (watch, youtu.be, Shorts, embed or live links). Returns null for anything
 * that isn't a YouTube video link, so the storefront never embeds a
 * random site.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

export function youtubeVideoId(link: string | null | undefined): string | null {
  const raw = link?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  let id: string | null = null;
  if (url.hostname.toLowerCase() === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
    id = match?.[1] ?? null;
  }
  return id && ID_PATTERN.test(id) ? id : null;
}

/** Privacy-friendly embed address that starts playing (after a tap). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
}
