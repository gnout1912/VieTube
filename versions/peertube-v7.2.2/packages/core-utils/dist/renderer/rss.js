import { VideoPrivacy } from '@peertube/peertube-models';
export function getDefaultRSSFeeds(url, instanceName) {
    return [
        {
            url: `${url}/feeds/videos.xml`,
            title: `${instanceName} - Videos feed`
        }
    ];
}
export function getChannelPodcastFeed(url, channel) {
    return `${url}/feeds/podcast/videos.xml?videoChannelId=${channel.id}`;
}
export function getChannelRSSFeeds(url, instanceName, channel) {
    return [
        {
            url: getChannelPodcastFeed(url, channel),
            title: `${channel.name} podcast feed`
        },
        {
            url: `${url}/feeds/videos.xml?videoChannelId=${channel.id}`,
            title: `${channel.name} feed`
        },
        ...getDefaultRSSFeeds(url, instanceName)
    ];
}
export function getVideoWatchRSSFeeds(url, instanceName, video) {
    if (video.privacy !== VideoPrivacy.PUBLIC)
        return getDefaultRSSFeeds(url, instanceName);
    return [
        {
            url: `${url}/feeds/video-comments.xml?videoId=${video.uuid}`,
            title: `${video.name} - Comments feed`
        },
        ...getDefaultRSSFeeds(url, instanceName)
    ];
}
//# sourceMappingURL=rss.js.map