"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          /*
            `--toast-*` là cặp nền/chữ nghịch đảo với trang, khai trong globals.css
            cho cả hai theme. Trước đây là `!bg-gray-900 !text-white`: khi thang gray
            đảo ở dark mode, `gray-900` thành gần TRẮNG trong khi chữ vẫn `text-white`
            — toast trắng trên chữ trắng, không đọc được gì.
          */
          toast:
            "!bg-[var(--toast-bg)] !text-[var(--toast-fg)] !border-transparent !shadow-xl !rounded-lg !gap-[9px] !text-sm !font-medium",
          success: "[&_svg]:!text-success",
          warning: "[&_svg]:!text-warning",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
