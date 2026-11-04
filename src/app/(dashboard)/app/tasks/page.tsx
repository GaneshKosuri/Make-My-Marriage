import type { Metadata } from "next";
import { Suspense } from "react";

import { TasksScreen } from "@/features/tasks/components/tasks-screen";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Tasks" };

/**
 * /app/tasks (PRD §9.6): All / My / Completed tasks with filters. The screen
 * reads `?view`, `?mine=true`, the filters and `?new=1` (open the add form)
 * from the address itself, so links keep working while it stays mounted.
 */
export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <Tasks />
    </Suspense>
  );
}

async function Tasks() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return (
    <TasksScreen
      timeZone={current.wedding.timeZone}
      today={dateOnlyInTimeZone(new Date(), current.wedding.timeZone)}
    />
  );
}
