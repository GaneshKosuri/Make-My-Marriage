import { Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import type { DashboardDto } from "@/modules/dashboard/dashboard.types";
import type { MemberRole } from "@/modules/members/member.constants";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { focusRing, primaryButton } from "./dashboard-card";

interface Step {
  key: string;
  title: string;
  hint: string;
  done: boolean;
  /** Absent when this member cannot take the step (Managers cannot invite members). */
  action?: { label: string; href: string };
}

/** The five setup steps, worked out from the dashboard counts. */
export function gettingStartedSteps(summary: DashboardDto["summary"], role: MemberRole): Step[] {
  const { steps } = DASHBOARD.checklist;
  return [
    {
      key: "event",
      ...steps.event,
      done: summary.events > 0,
      action: { label: steps.event.action, href: DASHBOARD_ROUTES.events },
    },
    {
      key: "task",
      ...steps.task,
      done: summary.tasks.total > 0,
      action: { label: steps.task.action, href: DASHBOARD_ROUTES.tasks },
    },
    {
      key: "guests",
      ...steps.guests,
      done: summary.guests > 0,
      action: { label: steps.guests.action, href: DASHBOARD_ROUTES.guests },
    },
    {
      key: "member",
      title: steps.member.title,
      hint: role === "ADMIN" ? steps.member.hint : steps.member.managerHint,
      done: summary.members > 1,
      action:
        role === "ADMIN"
          ? { label: steps.member.action, href: DASHBOARD_ROUTES.members }
          : undefined,
    },
    {
      key: "invitations",
      ...steps.invitations,
      done: summary.invitationsSent > 0,
      action: { label: steps.invitations.action, href: DASHBOARD_ROUTES.guests },
    },
  ];
}

/**
 * "Get started" checklist (Stitch M4/M5). The first open step gets the button;
 * the others link from their title. Hidden by the screen once every step is done.
 */
export function GetStarted({ steps }: Readonly<{ steps: readonly Step[] }>) {
  const copy = DASHBOARD.checklist;
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done && step.action);

  return (
    <section
      aria-label={copy.title}
      className="rounded-3xl border border-sand bg-white p-5 shadow-sm md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-headline-sm text-graphite">{copy.title}</h2>
          <p className="text-body-md text-plum">{copy.description}</p>
        </div>
        <span className="rounded-full bg-sand px-3 py-1 text-label-md text-graphite">
          {copy.progress(done, steps.length)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={copy.progress(done, steps.length)}
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand"
      >
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-2 min-[85rem]:grid-cols-5">
        {steps.map((step, index) => {
          const isNext = step === next;
          return (
            <li
              key={step.key}
              className={cn(
                "flex gap-3 rounded-2xl border p-4",
                isNext ? "border-gold/50 bg-ivory" : "border-sand",
                step.done && "bg-ivory/60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-label-sm",
                  step.done ? "bg-success text-white" : "border border-gold/60 text-gold-deep",
                )}
              >
                {step.done ? <Check className="size-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-label-md", step.done ? "text-plum" : "text-graphite")}>
                  {step.action && !step.done && !isNext ? (
                    <Link
                      href={step.action.href}
                      className={cn("rounded underline-offset-4 hover:underline", focusRing)}
                    >
                      {step.title}
                    </Link>
                  ) : (
                    step.title
                  )}
                  {step.done && <span className="sr-only"> (done)</span>}
                </p>
                {!step.done && <p className="mt-0.5 text-body-sm text-plum">{step.hint}</p>}
                {isNext && step.action && (
                  <Link href={step.action.href} className={cn(primaryButton, "mt-3 h-10 px-4")}>
                    {step.action.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
