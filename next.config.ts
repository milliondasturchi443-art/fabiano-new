import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const mediaUrl = process.env.S3_PUBLIC_BASE_URL ? new URL(process.env.S3_PUBLIC_BASE_URL) : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Загрузка фото товаров через server actions (до 12 файлов по 12 МБ проверяется в коде)
    serverActions: { bodySizeLimit: "60mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920, 2400],
    remotePatterns: mediaUrl
      ? [{ protocol: mediaUrl.protocol.replace(":", "") as "http" | "https", hostname: mediaUrl.hostname, port: mediaUrl.port }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Камера: нашей примерке (self) и окну Anywear (iframe с anywear.decart.ai), иначе «doesn't allow camera access»
          { key: "Permissions-Policy", value: 'camera=(self "https://anywear.decart.ai"), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
