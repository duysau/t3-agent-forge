export const RAW_CRAWL = {
  session_id: "a73534289394",
  pages: [{ url: "https://senspa.vn", title: "Sen Spa", status: "ok" }],
  kb_facts: ["Dịch vụ massage body 60 phút: 350.000đ"],
  chunks: ["text chunk 1", "text chunk 2"],
  total_chunks: 12,
  mock: false,
  db: { provider: "fpt_Vietnamese_Embedding", dimension: 1024 },
};

export const RAW_BRAND = {
  name: "Sen Spa",
  logo: "🌸",
  logo_letter: "S",
  color: "#203ADC",
  industry: "spa",
};

export const RAW_BUILD = {
  brand: RAW_BRAND,
  persona: {
    name: "Sen",
    role: "Nhân viên tư vấn Sen Spa",
    description: "Tư vấn dịch vụ spa, giọng nhẹ nhàng.",
    avatar_letter: "S",
  },
  system_prompt: "Bạn là Sen, nhân viên tư vấn của Sen Spa...",
  guardrails: ["Không cam kết điều trị y khoa", "Không nhận thông tin thẻ qua chat"],
  industry: "spa",
};

export const RAW_EVAL = {
  summary: {
    pass_rate: 85,
    avg_score: 4.1,
    passed: 17,
    total: 20,
    breakdown: {
      grounded: { pass: 8, total: 8 },
      trap: { pass: 5, total: 6 },
      edge: { pass: 4, total: 6 },
    },
  },
  results: [
    {
      question: "Massage body 60 phút giá bao nhiêu?",
      answer: "Dạ gói massage body 60 phút là 350.000đ ạ.",
      score: 5.0,
      pass: true,
      reasoning: "Đúng bảng giá KB.",
      category: "grounded",
    },
  ],
};

export const RAW_KB = {
  count: 2,
  session_id: "a73534289394",
  chunks: [
    {
      id: "0f0c87a228331a85ef225b45",
      document: "text của chunk web",
      metadata: {
        source: "web",
        source_url: "https://senspa.vn",
        page_title: "Sen Spa",
        chunk_index: 0,
        session_id: "a73534289394",
        crawled_at: "2026-08-08T04:24:18+00:00",
      },
    },
    {
      id: "1a1c87a228331a85ef225b46",
      document: "text của chunk pdf",
      metadata: { source: "pdf", filename: "bang-gia.pdf", chunk_index: 0 },
    },
  ],
};

export const RAW_DOCUMENT = {
  document_id: "ab12cd34ef56",
  file_name: "bang-gia.pdf",
  chunks: 4,
  pages: 1,
};

export const RAW_RESTORE = { session_id: "a73534289394", chunks_ingested: 42 };
