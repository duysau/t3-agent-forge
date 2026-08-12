import type { Metadata } from "next";

/*
  Không có `metadata` ở đây thì trang 404 thừa hưởng `robots: index, follow` của
  root layout — nên response 404 mang đúng hai thẻ robots đối nghịch nhau:
  `noindex` từ `generateMetadata` của route, và `index, follow` từ layout. Đo
  bằng curl trên `next start` thấy rõ cả hai cùng nằm trong `<head>`.

  Một trang "không tìm thấy" thì không bao giờ nên tự nhận là đáng index, và khi
  hai thẻ cùng tên xung đột thì hành vi tuỳ crawler — không đáng để đoán.
*/
export const metadata: Metadata = {
  title: "Không tìm thấy trang demo",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center max-[640px]:px-4">
      <h1 className="text-2xl font-extrabold text-gray-900">Không tìm thấy trang demo</h1>
      <p className="mt-2 text-muted-foreground">
        Link có thể đã bị xoá, hoặc bạn nhập sai địa chỉ.
      </p>
    </div>
  );
}
