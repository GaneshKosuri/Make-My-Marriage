"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { TaskPriority, TaskStatus } from "@/modules/tasks/task.constants";
import type { TaskDto } from "@/modules/tasks/task.types";

import { dashboardKeys } from "@/features/dashboard/query-keys";

import type { CreateTaskBody, UpdateTaskBody } from "./task-form";
import { tasksKeys } from "./query-keys";

/** TanStack Query hooks over the Tasks REST API (API_DESIGN §34–38). */

export interface TasksQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  /** An event id or "none". */
  eventId?: string;
  /** A membership id or "none". */
  assignedMembershipId?: string;
  mine?: boolean;
}

/** GET /api/tasks (API §34): one page, newest first. The last page stays on screen while the next loads. */
export function useTasks(query: TasksQuery) {
  return useQuery({
    queryKey: tasksKeys.list({ ...query }),
    queryFn: ({ signal }) => apiFetchPage<TaskDto>("/api/tasks", { query: { ...query }, signal }),
    placeholderData: keepPreviousData,
  });
}

/** Lists and the dashboard's task count and upcoming tasks change together. */
function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
}

/** POST /api/tasks (API §35). */
export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (body: CreateTaskBody) => apiFetch<TaskDto>("/api/tasks", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/tasks/:id (API §37): changed fields plus the version they were read at. */
export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: UpdateTaskBody }) =>
      apiFetch<TaskDto>(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/tasks/:id (API §38): permanent. */
export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiAction(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/**
 * GET /api/tasks/:id (API §36): the latest copy of one task, e.g. to reload an
 * edit form after a CONFLICT. Task lists are refreshed too.
 */
export function useReloadTask() {
  const queryClient = useQueryClient();
  return async (taskId: string) => {
    const task = await queryClient.fetchQuery({
      queryKey: tasksKeys.detail(taskId),
      queryFn: ({ signal }) =>
        apiFetch<TaskDto>(`/api/tasks/${encodeURIComponent(taskId)}`, { signal }),
      staleTime: 0,
    });
    void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    return task;
  };
}

/** Refetches every task list, e.g. after a CONFLICT. */
export function useRefreshTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: tasksKeys.all });
}
