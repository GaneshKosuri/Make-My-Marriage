// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useReloadedCopy } from "./use-reloaded-copy";

interface Item {
  id: string;
  version: number;
  name: string;
}

const v = (version: number, name = `v${version}`): Item => ({ id: "x", version, name });

function setup(record: Item | undefined, open = true) {
  return renderHook(({ record, open }) => useReloadedCopy(record, open), {
    initialProps: { record, open },
  });
}

describe("useReloadedCopy (QA C1)", () => {
  it("uses the reloaded copy while the dialog stays open, with a new form key", () => {
    const hook = setup(v(1));
    expect(hook.result.current.formKey).toBe("x:0");

    act(() => hook.result.current.setReloaded(v(2, "reloaded")));

    expect(hook.result.current.current?.name).toBe("reloaded");
    expect(hook.result.current.formKey).toBe("x:1");
  });

  it("drops the reloaded copy when the dialog closes, so reopening uses the latest record", () => {
    const hook = setup(v(1));
    act(() => hook.result.current.setReloaded(v(2, "reloaded")));

    hook.rerender({ record: v(1, "stale prop"), open: false });
    hook.rerender({ record: v(3, "latest"), open: true });

    expect(hook.result.current.current?.name).toBe("latest");
    expect(hook.result.current.formKey).toBe("x:0");
  });

  it("lets a newer copy from the server win over an older reloaded one", () => {
    const hook = setup(v(1));
    act(() => hook.result.current.setReloaded(v(2, "reloaded")));

    hook.rerender({ record: v(4, "newer from server"), open: true });

    expect(hook.result.current.current?.name).toBe("newer from server");
  });

  it("ignores a reloaded copy of another record", () => {
    const hook = setup(v(1));
    act(() => hook.result.current.setReloaded(v(5, "reloaded")));

    hook.rerender({ record: { id: "y", version: 0, name: "other" }, open: true });

    expect(hook.result.current.current?.name).toBe("other");
  });

  it("has a 'new' key when adding", () => {
    expect(setup(undefined).result.current.formKey).toBe("new");
  });
});
