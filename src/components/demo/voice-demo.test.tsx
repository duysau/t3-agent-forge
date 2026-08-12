import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceDemo } from "./voice-demo";

const { voiceCall, env } = vi.hoisted(() => ({
  voiceCall: {
    status: "idle" as string,
    error: null as string | null,
    endedReason: null as string | null,
    transcript: [] as Array<{ id: string; side: "user" | "agent"; text: string }>,
    agentSpeaking: false,
    start: vi.fn(async () => undefined),
    hangUp: vi.fn(async () => undefined),
  },
  env: {
    NEXT_PUBLIC_VOICE_GATEWAY_URL: "http://localhost:8787",
    NEXT_PUBLIC_VOICE_PROFILE: "longchau",
  },
}));

vi.mock("~/env", () => ({ env }));

// Hook thật đã có 20 test riêng (`use-voice-call.test.ts`) chạy trên fake gateway.
// Ở tầng này chỉ kiểm phần dây nối: hook nhận đúng baseUrl/profile từ env, và state
// của nó chảy đúng vào view.
const hookInput = vi.hoisted(() => ({ last: null as unknown }));
vi.mock("~/hooks/use-voice-call", () => ({
  useVoiceCall: (input: unknown) => {
    hookInput.last = input;
    return voiceCall;
  },
}));

beforeEach(() => {
  voiceCall.status = "idle";
  voiceCall.error = null;
  voiceCall.endedReason = null;
  voiceCall.transcript = [];
  voiceCall.agentSpeaking = false;
  voiceCall.start.mockClear();
  voiceCall.hangUp.mockClear();
  env.NEXT_PUBLIC_VOICE_GATEWAY_URL = "http://localhost:8787";
  env.NEXT_PUBLIC_VOICE_PROFILE = "longchau";
  hookInput.last = null;
});

describe("VoiceDemo", () => {
  it("truyền baseUrl và profile từ env xuống hook", () => {
    render(<VoiceDemo brandName="Sen Spa" />);

    expect(hookInput.last).toMatchObject({
      baseUrl: "http://localhost:8787",
      profile: "longchau",
    });
  });

  /**
   * `attributes` được gateway chuyển NGUYÊN VĂN lên nền tảng, nên đây là chỗ duy
   * nhất agent biết nó đang nói thay thương hiệu nào trong lượt gọi này.
   */
  it("gửi tên thương hiệu trong attributes của cuộc gọi", () => {
    render(<VoiceDemo brandName="Sen Spa" />);

    expect(hookInput.last).toMatchObject({ attributes: { brand: "Sen Spa" } });
  });

  it("thiếu gateway URL thì hiện thông báo chưa cấu hình", () => {
    env.NEXT_PUBLIC_VOICE_GATEWAY_URL = "";

    render(<VoiceDemo brandName={null} />);

    expect(screen.getByText(/chưa cấu hình/i)).toBeInTheDocument();
  });

  it("bấm Gọi thử thì chạy start của hook", async () => {
    render(<VoiceDemo brandName={null} />);

    await userEvent.click(screen.getByRole("button", { name: /Gọi thử/ }));

    expect(voiceCall.start).toHaveBeenCalledTimes(1);
  });

  it("chảy transcript và trạng thái của hook ra view", () => {
    voiceCall.status = "live";
    voiceCall.transcript = [{ id: "u1", side: "user", text: "alo" }];
    render(<VoiceDemo brandName={null} />);

    expect(screen.getByTestId("voice-bubble")).toHaveTextContent("alo");
    expect(screen.getByRole("button", { name: /Cúp máy/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/đang gọi/i);
  });
});
