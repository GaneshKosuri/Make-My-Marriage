/**
 * YouTube links for the wedding livestream (PRD §9.24, SYSTEM_DESIGN §43,
 * API_DESIGN §71). Isomorphic: the form checks links with the same rules the
 * server uses. Only links to one video or live stream are accepted; channel
 * links (`/@family/live`, `/channel/…`) can't be turned into a player without
 * YouTube's API (decided 2026-11-24).
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
/** Paths whose next segment is the video id: /live/ID, /embed/ID, /shorts/ID, /v/ID. */
const ID_PATH_PREFIXES = new Set(["live", "embed", "shorts", "v"]);

/** The 11-character video id, or null when the link isn't one video or live stream. */
export function youTubeVideoId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  let id: string | null | undefined = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch") id = url.searchParams.get("v");
    else if (segments.length >= 2 && ID_PATH_PREFIXES.has(segments[0]!)) id = segments[1];
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** The link stored for a video: one canonical form whatever was pasted. */
export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** The privacy-enhanced player (no cookies until the guest presses play). */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}
