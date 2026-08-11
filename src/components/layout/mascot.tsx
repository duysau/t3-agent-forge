/**
 * Mascot lấy nguyên văn từ prototype (dòng 466–502). `viewBox` 340×360 là
 * bắt buộc: `transform-origin` của tay vẫy (222px 196px) và của antenna
 * (170px 32px) nằm trong `globals.css` và tính theo hệ toạ độ này.
 *
 * Mọi `id` mang tiền tố `mascot-` vì id trong SVG là toàn cục trong document —
 * một `id="afBody"` trần sẽ đụng bất kỳ SVG khác dùng cùng tên.
 */
export function Mascot() {
  return (
    <div className="relative w-full max-w-[380px] animate-floaty max-[900px]:max-w-[220px]">
      <div className="absolute top-[2%] -left-[2%] z-10 animate-bubble rounded-2xl rounded-bl-[4px] border border-fci-100 bg-white px-[15px] py-[9px] text-[15px] font-bold whitespace-nowrap text-fci-700 shadow-md max-[900px]:hidden">
        Xin chào! 👋
      </div>
      <svg
        viewBox="0 0 340 360"
        role="img"
        aria-label="Trợ lý AI Agent đang vẫy tay chào"
        className="h-auto w-full overflow-visible [filter:drop-shadow(0_20px_34px_rgb(32_58_220/0.24))]"
      >
        <defs>
          <linearGradient id="mascot-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5371ec" />
            <stop offset="1" stopColor="#1a2fb0" />
          </linearGradient>
          <linearGradient id="mascot-head" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e7ecfd" />
          </linearGradient>
          <linearGradient id="mascot-arm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5371ec" />
            <stop offset="1" stopColor="#203ADC" />
          </linearGradient>
          <radialGradient id="mascot-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#5371ec" stopOpacity="0.32" />
            <stop offset="1" stopColor="#5371ec" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="170" cy="180" rx="160" ry="160" fill="url(#mascot-glow)" />
        <ellipse cx="170" cy="322" rx="80" ry="15" fill="#203ADC" opacity="0.12" />
        <rect x="136" y="282" width="30" height="28" rx="11" fill="#142484" />
        <rect x="174" y="282" width="30" height="28" rx="11" fill="#142484" />
        <path d="M120 198 L92 244" stroke="url(#mascot-arm)" strokeWidth="20" strokeLinecap="round" fill="none" />
        <circle cx="88" cy="250" r="15" fill="#203ADC" />
        <rect x="116" y="176" width="108" height="112" rx="32" fill="url(#mascot-body)" />
        <circle cx="170" cy="224" r="23" fill="#fff" />
        <text
          x="170"
          y="233"
          textAnchor="middle"
          fontFamily="Inter,system-ui,sans-serif"
          fontWeight="800"
          fontSize="26"
          fill="#203ADC"
        >
          A
        </text>
        <rect x="158" y="156" width="24" height="26" rx="8" fill="#aab9f5" />
        <rect x="102" y="58" width="136" height="106" rx="30" fill="url(#mascot-head)" stroke="#d5dcfa" strokeWidth="2" />
        <rect x="118" y="78" width="104" height="68" rx="22" fill="#0e1858" />
        <circle cx="149" cy="108" r="9" fill="#7ee0ff" />
        <circle cx="191" cy="108" r="9" fill="#7ee0ff" />
        <circle cx="152" cy="105" r="3" fill="#fff" />
        <circle cx="194" cy="105" r="3" fill="#fff" />
        <path d="M150 126 Q170 141 190 126" stroke="#7ee0ff" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="131" cy="126" r="6" fill="#7e95f1" opacity="0.45" />
        <circle cx="209" cy="126" r="6" fill="#7e95f1" opacity="0.45" />
        <line x1="170" y1="58" x2="170" y2="36" stroke="#aab9f5" strokeWidth="5" strokeLinecap="round" />
        <circle className="animate-antenna" cx="170" cy="32" r="7" fill="#17B26A" />
        <circle cx="170" cy="32" r="7" fill="#17B26A" />
        <g className="animate-wavehand">
          <path d="M222 196 L252 148" stroke="url(#mascot-arm)" strokeWidth="20" strokeLinecap="round" fill="none" />
          <circle cx="258" cy="140" r="16" fill="#203ADC" />
        </g>
      </svg>
    </div>
  );
}
