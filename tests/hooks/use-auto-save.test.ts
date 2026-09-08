// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "@/hooks/use-auto-save";

describe("useAutoSave()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa com status idle", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ onSave }));
    expect(result.current.status).toBe("idle");
  });

  it("fica dirty imediatamente ao chamar save(), antes do debounce disparar", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "valor" });
    });

    expect(result.current.status).toBe("dirty");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("chama onSave só depois do debounce, com o último valor", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "primeiro" });
    });
    act(() => {
      vi.advanceTimersByTime(500); // ainda dentro do debounce
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      result.current.save({ campo: "segundo" }); // reinicia o debounce
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ campo: "segundo" });
  });

  it("marca status como saved depois que onSave resolve", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "valor" });
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.status).toBe("saved");
  });

  it("marca status como error quando onSave rejeita", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "valor" });
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.status).toBe("error");
  });

  it("volta pra idle 3s depois de saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "valor" });
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.status).toBe("saved");

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.status).toBe("idle");
  });

  it("reset() cancela o debounce pendente e volta pra idle", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ onSave, debounceMs: 1500 }),
    );

    act(() => {
      result.current.save({ campo: "valor" });
      result.current.reset();
    });
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
