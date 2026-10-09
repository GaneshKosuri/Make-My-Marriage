import type { Metadata } from "next";

import { HomePage } from "@/features/marketing/components/home-page";

export const metadata: Metadata = {
  title: { absolute: "Make My Marriage · The wedding workspace for Indian families" },
  description:
    "Plan your Indian wedding together: events, tasks, guests and RSVPs, family roles and a private photo gallery in one shared workspace. Guests never need an account.",
};

export default function Page() {
  return <HomePage />;
}
