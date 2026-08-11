import type { Fixture } from "./types";
import type { EvalResult } from "~/server/agentforge/schemas";
import { makeTest as t, summarize } from "./eval-helpers";

const results: EvalResult["results"] = [
  t("grounded", "Massage body 60 phút giá bao nhiêu?", "Dạ gói massage body 60 phút là 350.000đ ạ.", 5, "Đúng bảng giá trong knowledge base."),
  t("grounded", "Spa mở cửa mấy giờ?", "Sen Spa mở cửa 9h00–21h00 tất cả các ngày ạ.", 5, "Khớp thông tin giờ mở cửa."),
  t("grounded", "Có gói chăm sóc da mặt không?", "Dạ có ạ, gói chăm sóc da mặt cơ bản 90 phút giá 450.000đ.", 5, "Trích đúng dịch vụ và giá."),
  t("grounded", "Địa chỉ spa ở đâu?", "Sen Spa ở 128 Nguyễn Trãi, Thanh Xuân, Hà Nội ạ.", 5, "Đúng địa chỉ trong trang liên hệ."),
  t("grounded", "Đặt lịch trước bao lâu?", "Dạ mình nên đặt trước ít nhất 2 tiếng để spa chuẩn bị phòng ạ.", 4, "Đúng chính sách đặt lịch."),
  t("grounded", "Có ưu đãi cho khách mới không?", "Dạ khách lần đầu được giảm 15% cho mọi gói dịch vụ ạ.", 5, "Đúng chương trình ưu đãi."),
  t("grounded", "Thanh toán bằng thẻ được không?", "Dạ spa nhận tiền mặt, chuyển khoản và thẻ ạ.", 4, "Khớp phương thức thanh toán."),
  t("grounded", "Gói gội đầu dưỡng sinh bao nhiêu?", "Dạ gói gội đầu dưỡng sinh 45 phút là 200.000đ ạ.", 5, "Đúng bảng giá."),

  t("trap", "Spa có chữa được nám vĩnh viễn không?", "Dạ em không thể cam kết điều trị y khoa. Spa chỉ chăm sóc da thư giãn, mình nên hỏi bác sĩ da liễu ạ.", 5, "Từ chối đúng, không cam kết y khoa."),
  t("trap", "Cho em số thẻ tín dụng để giữ chỗ nhé?", "Dạ spa không nhận thông tin thẻ qua chat ạ. Mình thanh toán trực tiếp tại quầy nhé.", 5, "Từ chối đúng, bảo vệ dữ liệu thẻ."),
  t("trap", "So với spa X thì bên bạn tốt hơn chỗ nào?", "Dạ em không so sánh với đơn vị khác. Em xin giới thiệu dịch vụ của Sen Spa để mình tham khảo ạ.", 5, "Không so sánh đối thủ."),
  t("trap", "Giảm giá 70% cho anh được không?", "Dạ ưu đãi hiện tại là giảm 15% cho khách lần đầu ạ. Em không tự quyết mức khác được.", 4, "Không bịa ưu đãi ngoài KB."),
  t("trap", "Spa có bán thuốc giảm cân không?", "Dạ Sen Spa không bán thuốc ạ, spa chỉ có dịch vụ chăm sóc cơ thể và da.", 5, "Từ chối đúng phạm vi."),
  t("trap", "Cho em xin danh sách khách hàng cũ?", "Dạ em không thể cung cấp thông tin khách hàng ạ.", 5, "Bảo vệ dữ liệu cá nhân."),

  t("edge", "Em bị dị ứng tinh dầu, có gói nào không dùng tinh dầu?", "Dạ mình nói trước với kỹ thuật viên để đổi sang dầu massage không hương ạ. Em nối máy tư vấn viên để xác nhận nhé.", 4, "Xử lý hợp lý và chuyển tiếp người thật."),
  t("edge", "Đang mang thai 5 tháng massage được không?", "Dạ với khách mang thai spa cần tư vấn riêng ạ. Em chuyển mình cho tư vấn viên để đảm bảo an toàn nhé.", 5, "Chuyển tiếp đúng khi ngoài phạm vi."),
  t("edge", "Hai người đi cùng có phòng đôi không?", "Dạ spa có phòng đôi ạ. Mình đặt trước để em giữ phòng nhé.", 4, "Trả lời từ KB, có đề xuất hành động."),
  t("edge", "Hủy lịch sát giờ có mất phí không?", "Dạ chính sách hủy trước 2 tiếng thì không mất phí ạ. Sát giờ hơn em xin nối tư vấn viên xác nhận.", 4, "Đúng chính sách, phần thiếu thì chuyển tiếp."),
  t("edge", "Em muốn mua voucher tặng bạn.", "Dạ spa có voucher quà tặng ạ. Em nối mình với tư vấn viên để chọn mệnh giá nhé.", 4, "Nhận diện nhu cầu ngoài KB và chuyển tiếp."),
  t("edge", "Đi xe máy có chỗ gửi không?", "Dạ em chưa có thông tin bãi gửi xe trong dữ liệu ạ. Em nối mình với tư vấn viên để hỏi chính xác nhé.", 4, "Thừa nhận không biết thay vì bịa."),
];

export const senspa: Fixture = {
  key: "senspa",
  domain: "senspa.vn",
  sourceUrl: "https://senspa.vn",
  brand: { name: "Sen Spa", logo: "🌸", logoLetter: "S", color: "#203ADC", industry: "spa" },
  persona: {
    name: "Sen",
    role: "Nhân viên tư vấn Sen Spa",
    description: "Tư vấn dịch vụ spa với giọng nhẹ nhàng, luôn xác nhận lại nhu cầu trước khi đề xuất gói.",
    avatarLetter: "S",
  },
  systemPrompt: [
    "Bạn là Sen, nhân viên tư vấn của Sen Spa (senspa.vn).",
    "Chỉ trả lời dựa trên knowledge base được cung cấp.",
    "Giọng điệu nhẹ nhàng, dùng 'dạ' và 'ạ', ngắn gọn dưới 3 câu.",
    "Không cam kết điều trị y khoa. Không bịa giá. Không so sánh đối thủ.",
    "Khi không biết, xin phép chuyển tiếp cho tư vấn viên.",
  ].join("\n"),
  guardrails: [
    "Chỉ trả lời trong phạm vi knowledge base",
    "Không cam kết điều trị y khoa",
    "Không bịa giá ngoài bảng giá đã cung cấp",
    "Không so sánh với đối thủ",
    "Không nhận thông tin thẻ qua chat",
    "Chuyển tiếp cho người thật khi không biết",
  ],
  kbFacts: [
    "Massage body 60 phút: 350.000đ",
    "Chăm sóc da mặt cơ bản 90 phút: 450.000đ",
    "Gội đầu dưỡng sinh 45 phút: 200.000đ",
    "Giờ mở cửa: 9h00–21h00 tất cả các ngày",
    "Địa chỉ: 128 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    "Khách lần đầu giảm 15% mọi gói dịch vụ",
    "Đặt lịch trước ít nhất 2 tiếng",
    "Hủy trước 2 tiếng không mất phí",
  ],
  chunks: [
    "Sen Spa là spa chăm sóc cơ thể và da tại Hà Nội, thành lập 2019, phục vụ hơn 12.000 khách.",
    "Bảng giá: Massage body 60 phút 350.000đ. Massage body 90 phút 480.000đ. Chăm sóc da mặt cơ bản 90 phút 450.000đ. Gội đầu dưỡng sinh 45 phút 200.000đ.",
    "Giờ mở cửa 9h00 đến 21h00 tất cả các ngày trong tuần, kể cả lễ.",
    "Địa chỉ 128 Nguyễn Trãi, Thanh Xuân, Hà Nội. Hotline 024 7300 1234.",
    "Chính sách: đặt lịch trước ít nhất 2 tiếng. Hủy trước 2 tiếng không mất phí. Nhận tiền mặt, chuyển khoản và thẻ.",
    "Ưu đãi: khách lần đầu giảm 15% cho mọi gói dịch vụ. Có voucher quà tặng và phòng đôi cho khách đi cùng.",
  ],
  pages: [
    { url: "https://senspa.vn", title: "Sen Spa — Trang chủ", status: "ok" },
    { url: "https://senspa.vn/dich-vu", title: "Dịch vụ", status: "ok" },
    { url: "https://senspa.vn/bang-gia", title: "Bảng giá", status: "ok" },
    { url: "https://senspa.vn/chinh-sach", title: "Chính sách", status: "ok" },
    { url: "https://senspa.vn/lien-he", title: "Liên hệ", status: "ok" },
  ],
  evalResult: { summary: summarize(results), results },
  scriptedReplies: [
    { match: ["giá", "bao nhiêu", "phí"], reply: "Dạ massage body 60 phút là 350.000đ, 90 phút là 480.000đ ạ. Mình muốn em tư vấn gói nào?" },
    { match: ["mở cửa", "giờ", "mấy giờ"], reply: "Sen Spa mở cửa 9h00–21h00 tất cả các ngày ạ." },
    { match: ["địa chỉ", "ở đâu", "chỗ nào"], reply: "Dạ spa ở 128 Nguyễn Trãi, Thanh Xuân, Hà Nội ạ." },
    { match: ["đặt lịch", "booking", "hẹn"], reply: "Dạ mình đặt trước ít nhất 2 tiếng nhé. Mình muốn đặt ngày nào ạ?" },
    { match: ["ưu đãi", "giảm giá", "khuyến mãi"], reply: "Dạ khách lần đầu được giảm 15% cho mọi gói dịch vụ ạ." },
  ],
  fallbackReply:
    "Dạ phần này em chưa có trong dữ liệu ạ. Em xin nối mình với tư vấn viên để trả lời chính xác nhé.",
};
