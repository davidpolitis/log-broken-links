let config =
{
    initialDirectories: ['/home/david/dst'],
    useInitialUrls: false,
    initialUrls: ['https://initialwebsite.com/'],
    concurrency: 1, // Number of queued tasks to perform at once (Recommended: 1)
    timeout: 10000, // Timeout duration for HTTP/HTTPS requests
    rateLimit: 1000, // Number of milliseconds to delay before each queued task (Recommended: >= 1000)
    retries: 3, // Number of retries if the request fails (Recommended: 3)
    retriesTimeout: 10000, // Number of milliseconds to wait before retrying (Recommended: 10000)
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, // Avoids bot-detection
};

// URL formats which are known to return 404s for invalid/broken URLs - Either RegExp or exact
config.notfoundUrls = [
    {
        hostname: "twitter[.]com",
        path: "/.*"
    },
    {
        hostname: "www[.]youtube[.]com",
        path: "/channel/.*"
    },
    {
        hostname: "www[.]youtube[.]com",
        path: "/user/.*"
    },
    {
        hostname: "fandom[.]com",
        path: "/.*"
    },
    {
        hostname: ".*[.]fandom[.]com",
        path: "/.*"
    },
    {
        hostname: "wikia[.]com",
        path: "/.*"
    },
    {
        hostname: ".*[.]wikia[.]com",
        path: "/.*"
    },
    {
        hostname: "vocadb[.]net",
        path: "/.*"
    },
    {
        hostname: "bandcamp[.]com",
        path: "/.*"
    },
    {
        hostname: "nicovideo[.]jp",// https://www.nicovideo.jp/mylist/59797834!
        path: "/.*"
    },
    {
        hostname: ".*[.]nicovideo[.]jp",// https://www.nicovideo.jp/mylist/59797834!
        path: "/.*"
    },
    {
        hostname: "piapro[.]jp",
        path: "/.*"
    },
    {
        hostname: "pixiv[.]net",
        path: "/.*"
    },
    {
        hostname: ".*[.]atwiki[.]jp",
        path: "/.*"
    },
    {
        hostname: ".*[.]animelyrics[.]com",
        path: "/.*"
    },
    {
        hostname: "wikipedia[.]org",
        path: "/.*"
    },
    {
        hostname: ".*[.]wikipedia[.]org",
        path: "/.*"
    },
    {
        hostname: "www[.]kkbox[.]com",
        path: "/.*"
    },
    {
        hostname: "utaitedb[.]net",
        path: "/.*"
    },
    {
        hostname: "tumblr[.]com",
        path: "/.*"
    },
    {
        hostname: ".*[.]tumblr[.]com",
        path: "/.*"
    }
]

// URL formats to translate to oembed URLs to return 404s for invalid/broken URLs - Either RegExp or exact
config.oembedUrls = [
    {
        hostname: "www[.]youtube[.]com",
        path: "/watch?v=.*", // We don't need one for user URLs as they return 404s and cannot be embedded, E.g. https://www.youtube.com/user/rnfjcvx87cvx7x
        redirect_prefix: "https://www.youtube.com/oembed?format=json&url="
    },
    {
        hostname: "youtu[.]be",
        path: "/.*",
        redirect_prefix: "https://www.youtube.com/oembed?format=json&url="
    },
    {
        hostname: "soundcloud.com",
        path: "/.*",
        redirect_prefix: "https://soundcloud.com/oembed?url="
    }
];

// Custom 404 checks
config.notFoundTests = [
    {
        hostname: "karent[.]jp",
        path: "/artist/.*",
        test: function(html)
        {
            return (html.toLowerCase().includes('アーティストが見つかりません'));
        }
    }
]

// Generic 404 check
config.genericNotFoundTest = function(html)
{
    return (html.toLowerCase().includes('Not Found'));
}

module.exports = config;