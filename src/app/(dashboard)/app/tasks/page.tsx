import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <PagePlaceholder
      title="Tasks"
      phase="Phase 2: Planning"
      description="All, My and Completed tasks with filters (PRD §9.6)."
    />
  );
}
