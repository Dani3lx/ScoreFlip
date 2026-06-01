import withPWA from "next-pwa";

const nextConfig = withPWA({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "mediapipe-cdn",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
        },
        {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "mediapipe-models",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
        },
    ],
})({
    turbopack: {},
});

export default nextConfig;
