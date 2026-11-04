/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Workers Assets で配信するため静的書き出しにする（out/ に出力）。
  // SSR・API Routes には依存しない。API は同一オリジンの /api/* を Worker が受ける。
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  // trailingSlash の自動リダイレクトが /api/* の rewrite より先に働かないよう無効化する
  skipTrailingSlashRedirect: true,
  // リポジトリ直下にも lockfile があるため、Turbopack の作業ルートをこのフォルダに固定する
  turbopack: { root: __dirname },
}

// 開発時のみ、同一オリジン化のため /api/* を wrangler dev（既定 http://127.0.0.1:8787）へ転送する。
// 本番（output: 'export'）には rewrites は含めない（静的書き出しで rewrites は使えないため）。
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => ({
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: `${process.env.API_ORIGIN ?? 'http://127.0.0.1:8787'}/api/:path*`,
      },
    ],
    afterFiles: [],
    fallback: [],
  })
}

module.exports = nextConfig
