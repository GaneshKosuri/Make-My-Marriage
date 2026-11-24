import { WebsiteUnavailable } from "@/features/website/components/site-messages";

/** /w/[slug] for an unpublished, deleted or unknown wedding (API_DESIGN §69). */
export default function WebsiteNotFound() {
  return <WebsiteUnavailable />;
}
