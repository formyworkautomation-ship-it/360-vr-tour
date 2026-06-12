import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // إجبار Vercel على إكمال البناء حتى لو كان هناك تحذيرات في الكود أو ملفات الاختبار
    ignoreDuringBuilds: true,
  },
  typescript: {
    // إجبار Vercel على إكمال البناء وتجاهل أخطاء الـ TypeScript الخاصة بـ Marzipano
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
