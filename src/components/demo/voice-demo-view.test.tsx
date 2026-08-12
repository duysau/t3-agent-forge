import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceDemoView, type VoiceDemoViewProps } from "./voice-demo-view";

function props(over: Partial<VoiceDemoViewProps> = {}): VoiceDemoViewProps {
  return {
    configured: true,
    status: "idle",
    error: null,
    endedReason: null,
    transcript: [],
    agentSpeaking: false,
    onCall: vi.fn(),
    onHangUp: vi.fn(),
    ...over,
  };
}

describe("VoiceDemoView", () => {
  /**
   * Gateway là một tiến trình riêng, thường chỉ dựng trên máy demo. Thiếu cấu hình
   * thì phải nói ra, KHÔNG được hiện một nút Gọi bấm vào là lỗi — trên sân khấu,
   * một nút chết tệ hơn một dòng giải thích.
   */
  it("chưa cấu hình gateway thì nói rõ và không có nút Gọi", () => {
    render(<VoiceDemoView {...props({ configured: false })} />);

    expect(screen.getByText(/chưa cấu hình/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Gọi/ })).not.toBeInTheDocument();
  });

  it("trạng thái idle thì có nút Gọi, không có nút Cúp máy", () => {
    render(<VoiceDemoView {...props()} />);

    expect(screen.getByRole("button", { name: /Gọi/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Cúp máy/ })).not.toBeInTheDocument();
  });

  it("đang nối thì khoá nút Gọi để không mở hai phiên", async () => {
    render(<VoiceDemoView {...props({ status: "connecting" })} />);

    expect(screen.getByRole("button", { name: /Đang nối|Gọi/ })).toBeDisabled();
  });

  it("đang gọi thì hiện nút Cúp máy và gọi onHangUp khi bấm", async () => {
    const onHangUp = vi.fn();
    render(<VoiceDemoView {...props({ status: "live", onHangUp })} />);

    await userEvent.click(screen.getByRole("button", { name: /Cúp máy/ }));

    expect(onHangUp).toHaveBeenCalledTimes(1);
  });

  it("bấm Gọi thì gọi onCall", async () => {
    const onCall = vi.fn();
    render(<VoiceDemoView {...props({ onCall })} />);

    await userEvent.click(screen.getByRole("button", { name: /Gọi/ }));

    expect(onCall).toHaveBeenCalledTimes(1);
  });

  it("hiện transcript hai bên đúng người nói", () => {
    render(
      <VoiceDemoView
        {...props({
          status: "live",
          transcript: [
            { id: "u1", side: "user", text: "cho tôi hỏi giá" },
            { id: "a1", side: "agent", text: "dạ 350.000đ ạ" },
          ],
        })}
      />,
    );

    const bubbles = screen.getAllByTestId("voice-bubble");
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0]).toHaveAttribute("data-side", "user");
    expect(bubbles[0]).toHaveTextContent("cho tôi hỏi giá");
    expect(bubbles[1]).toHaveAttribute("data-side", "agent");
  });

  /**
   * Trong lúc gọi phải có một chỉ báo sống — chấm đỏ nhấp nháy kiểu đèn ghi âm —
   * để người dùng biết đường thoại đang mở. Không có nó, một cuộc gọi im lặng vài
   * giây trông y hệt một cuộc gọi đã chết.
   *
   * Live region CÓ TEXT: `role="status"` chỉ được đọc khi bên trong có text node —
   * bài học đã trả giá ở chỉ báo đang gõ của `ChatDemoView`. Chấm đỏ để nhìn, dòng
   * chữ để đọc.
   */
  it("đang gọi thì hiện chấm đỏ kèm chữ, trong một live region", () => {
    render(<VoiceDemoView {...props({ status: "live" })} />);

    const live = screen.getByRole("status");
    expect(live).toHaveTextContent(/đang gọi/i);
    expect(live.querySelector("[data-testid='call-dot']")).not.toBeNull();
  });

  it("chưa gọi thì không có chỉ báo nào", () => {
    render(<VoiceDemoView {...props({ status: "idle" })} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("đang nối thì chỉ báo nói đang nối, chưa nói đang gọi", () => {
    render(<VoiceDemoView {...props({ status: "connecting" })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/đang nối/i);
  });

  /**
   * Một live region duy nhất cho cả hai tin: đường thoại đang mở, và ai đang nói.
   * Hai live region cùng phát là tiếng ồn cho screen reader, và trên màn hình là
   * hai chỉ báo tranh nhau nói cùng một chuyện.
   */
  it("agent đang nói thì chính chỉ báo đó đổi chữ, chấm đỏ vẫn còn", () => {
    render(<VoiceDemoView {...props({ status: "live", agentSpeaking: true })} />);

    const live = screen.getByRole("status");
    expect(live).toHaveTextContent(/agent đang nói/i);
    expect(live.querySelector("[data-testid='call-dot']")).not.toBeNull();
  });

  it("hết cuộc gọi thì hiện lý do kết thúc, không hiện như lỗi", () => {
    render(
      <VoiceDemoView
        {...props({ status: "ended", endedReason: "Hết thời gian tối đa của một cuộc gọi" })}
      />,
    );

    expect(screen.getByText(/Hết thời gian tối đa/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lỗi hiện trong vùng alert kèm nguyên văn thông báo", () => {
    render(
      <VoiceDemoView
        {...props({
          status: "error",
          error: 'Gateway không có Agent Profile "longchau"',
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent('Gateway không có Agent Profile "longchau"');
  });

  it("gọi lại được sau khi lỗi", () => {
    render(<VoiceDemoView {...props({ status: "error", error: "hỏng" })} />);

    expect(screen.getByRole("button", { name: /Gọi/ })).toBeEnabled();
  });

  /**
   * Nút "Đẩy KB lên agent voice" đã bị GỠ theo yêu cầu, cùng với dòng cảnh báo về
   * agent dùng chung. Test này chốt việc gỡ đó: màn demo chỉ còn hai thao tác —
   * gọi và cúp — nên không có nút nào khác lọt lại vào thanh điều khiển.
   *
   * KB vẫn được đẩy lên agent voice trong lượt build `product: "voice"` (backend tự
   * làm, xem `voicePublish` ở Bước 3); chỉ đường bấm tay ở đây là không còn.
   */
  it("không còn nút đẩy KB nào trong màn demo", () => {
    render(<VoiceDemoView {...props()} />);

    expect(screen.queryByRole("button", { name: /Đẩy KB/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

/**
 * Cùng bug với ChatDemoView, nặng hơn: transcript voice chảy liên tục theo từng
 * `reply.segment`, nên không tự cuộn thì câu agent vừa nói gần như không bao giờ
 * nhìn thấy. Số học "có đang theo dõi đáy không" đã kiểm trong test của
 * `useStickToBottom`; ở đây chỉ kiểm dây nối.
 */
describe("VoiceDemoView tự cuộn", () => {
  it("câu thoại mới thì kéo khung transcript xuống đáy", () => {
    const { rerender } = render(
      <VoiceDemoView
        {...props({ status: "live", transcript: [{ id: "u1", side: "user", text: "alo" }] })}
      />,
    );
    const region = screen.getByTestId("voice-scroll");
    Object.defineProperty(region, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 380, configurable: true });

    rerender(
      <VoiceDemoView
        {...props({
          status: "live",
          transcript: [
            { id: "u1", side: "user", text: "alo" },
            { id: "a1", side: "agent", text: "dạ em nghe" },
          ],
        })}
      />,
    );

    expect(region.scrollTop).toBe(1000);
  });
});
