import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWizard } from "./use-wizard";

describe("useWizard", () => {
  it("bắt đầu ở bước 1, chưa có slug", () => {
    const { result } = renderHook(() => useWizard());
    expect(result.current.step).toBe(1);
    expect(result.current.slug).toBeNull();
    expect(result.current.product).toBeNull();
  });

  it("chưa có slug thì không được sang bước 2", () => {
    const { result } = renderHook(() => useWizard());
    expect(result.current.canGoTo(2)).toBe(false);
    act(() => result.current.next());
    expect(result.current.step).toBe(1);
  });

  it("có slug thì sang được bước 2", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.setSlug("abc123def456"));
    expect(result.current.canGoTo(2)).toBe(true);
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
  });

  it("chưa chọn sản phẩm thì không sang được bước 3", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.setSlug("abc123def456"));
    act(() => result.current.goTo(2));
    expect(result.current.canGoTo(3)).toBe(false);
    act(() => result.current.setProduct("chat"));
    expect(result.current.canGoTo(3)).toBe(true);
  });

  it("quay lại được bước trước", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.setSlug("abc123def456"));
    act(() => result.current.goTo(2));
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("không quay lại thấp hơn bước 1", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("nhận slug ban đầu để resume sau khi F5", () => {
    const { result } = renderHook(() => useWizard({ initialSlug: "resume123456" }));
    expect(result.current.slug).toBe("resume123456");
    expect(result.current.canGoTo(2)).toBe(true);
  });

  it("chọn voice thì giữ voiceId, đổi sang chat thì xoá", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.setProduct("voice"));
    act(() => result.current.setVoiceId("std_kimngan"));
    expect(result.current.voiceId).toBe("std_kimngan");
    act(() => result.current.setProduct("chat"));
    expect(result.current.voiceId).toBeNull();
  });

  it("reset đưa về trạng thái đầu", () => {
    const { result } = renderHook(() => useWizard());
    act(() => result.current.setSlug("abc123def456"));
    act(() => result.current.setProduct("chat"));
    act(() => result.current.goTo(3));
    act(() => result.current.reset());
    expect(result.current.step).toBe(1);
    expect(result.current.slug).toBeNull();
    expect(result.current.product).toBeNull();
  });
});
