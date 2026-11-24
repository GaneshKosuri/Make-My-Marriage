import { describe, expect, it } from "vitest";

import { youTubeEmbedUrl, youTubeVideoId, youTubeWatchUrl } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("youTubeVideoId", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=shared`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])("finds the video in %s", (link) => {
    expect(youTubeVideoId(link)).toBe(ID);
  });

  it.each([
    "",
    "https://www.youtube.com/@akshayprinci/live",
    "https://www.youtube.com/channel/UC1234567890abcdefghijk/live",
    "https://www.youtube.com/c/AkshayPrinci",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=short",
    `https://vimeo.com/${ID}`,
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `javascript:alert('${ID}')`,
    "not a link",
  ])("refuses %j", (link) => {
    expect(youTubeVideoId(link)).toBeNull();
  });
});

describe("YouTube links", () => {
  it("stores one canonical link and plays through the privacy-enhanced player", () => {
    expect(youTubeWatchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(youTubeEmbedUrl(ID)).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0&modestbranding=1`,
    );
  });
});
