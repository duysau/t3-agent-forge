import type { MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  /*
    Chỉ có `/` trong sitemap, và đó là đầy đủ: `/s/[slug]` bị `Disallow` trong
    robots.ts (trang demo per-khách, không được index), `/api/*` không có gì để
    index. Thêm URL bị chặn vào sitemap là tự gửi tín hiệu mâu thuẫn cho Google
    và sinh warning trong Search Console.

    `lastModified` là ngày build. Không lý tưởng — nó nhảy mỗi lần deploy kể cả
    khi nội dung không đổi — nhưng đây là landing page một trang, deploy gần như
    luôn đi kèm sửa nội dung, nên tín hiệu vẫn gần đúng. Khi nào thêm blog/docs
    thì mới cần ngày theo từng trang (từ CMS hoặc frontmatter), lúc đó sửa ở đây.
  */
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
