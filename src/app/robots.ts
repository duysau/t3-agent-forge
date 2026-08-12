import type { MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        /*
          `/s/` là trang demo sinh tự động cho từng khách — mỗi lượt crawl tạo
          một slug mới. Để crawler ăn hết chỗ đó thì domain sẽ đầy trang mỏng,
          gần trùng nhau, tự cạnh tranh với chính landing page. Chặn ở đây, và
          `generateMetadata` của trang đó cũng trả `robots: noindex` — cần cả
          hai vì `Disallow` chỉ ngăn crawl, KHÔNG ngăn index một URL đã được ai
          đó link tới từ bên ngoài.

          `/api/` không có gì để index.
        */
        disallow: ["/s/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
