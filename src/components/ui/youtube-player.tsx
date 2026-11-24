import { cn } from "@/lib/cn";

/**
 * The embedded YouTube player for the wedding livestream (PRD §9.24). Uses the
 * privacy-enhanced domain (no cookies until the viewer presses play), which is
 * the only frame source the security policy allows. Renders nothing for links
 * that aren't the privacy-enhanced embed.
 */
export function YouTubePlayer({
  embedUrl,
  title,
  className,
}: Readonly<{ embedUrl: string; title: string; className?: string }>) {
  if (!embedUrl.startsWith("https://www.youtube-nocookie.com/embed/")) return null;
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-graphite", className)}>
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
