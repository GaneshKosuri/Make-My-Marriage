import type { Metadata } from "next";
import { Suspense } from "react";

import { TasksScreen } from "@/features/tasks/components/tasks-screen";
import { readTasksUrl } from "@/features/tasks/url-state";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Tasks" };

/**
 * /app/tasks (PRD §9.6): All / My / Completed tasks with filters. `?view`,
 * `?mine=true`, the filters and `?new=1` (open the add form) come from links.
 */
export default function TasksPage({ searchParams }: PageProps<"/app/tasks">) {
  return (
    <Suspense fallback={null}>
      <Tasks searchParams={searchParams} />
    </Suspense>
  );
}

async function Tasks({ searchParams }: Pick<PageProps<"/app/tasks">, "searchParams">) {
  // Memoised per request: the layout's guard made the same call.
  const [current, params] = await Promise.all([getCurrentContext(), searchParams]);
  if (!current?.wedding) return null;
  const { view, filters, startAdding } = readTasksUrl(params);
  return (
    <TasksScreen
      timeZone={current.wedding.timeZone}
      today={dateOnlyInTimeZone(new Date(), current.wedding.timeZone)}
      initialView={view}
      initialFilters={filters}
      startAdding={startAdding}
    />
  );
}
