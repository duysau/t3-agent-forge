"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export function BackendStatusBannerView({
  backend,
  reason,
  checking,
  onRecheck,
}: {
  backend: "up" | "down";
  reason: string | null;
  checking: boolean;
  onRecheck: () => void;
}) {
  if (checking || backend === "up") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3">
      <TriangleAlert className="size-4 shrink-0 text-warning-strong" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-warning-strong">
          Backend chưa kết nối — mọi bước sẽ chạy bằng dữ liệu mẫu
        </p>
        {reason && <p className="mt-0.5 text-[13px] text-warning-strong/80">{reason}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={onRecheck}>
        Kiểm tra lại
      </Button>
    </div>
  );
}

export function BackendStatusBanner() {
  const health = api.source.health.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  return (
    <BackendStatusBannerView
      backend={health.data?.backend ?? "up"}
      reason={health.data?.reason ?? null}
      checking={health.isPending || health.isFetching}
      onRecheck={() => void health.refetch()}
    />
  );
}
