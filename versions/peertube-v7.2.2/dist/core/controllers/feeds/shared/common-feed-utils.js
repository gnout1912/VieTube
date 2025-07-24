import { Feed } from '@peertube/feed';
import { pick } from '@peertube/peertube-core-utils';
import { ActorImageType } from '@peertube/peertube-models';
import { mdToPlainText } from '../../../helpers/markdown.js';
import { CONFIG } from '../../../initializers/config.js';
import { WEBSERVER } from '../../../initializers/constants.js';
import { UserModel } from '../../../models/user/user.js';
export function initFeed(parameters) {
    const webserverUrl = WEBSERVER.URL;
    const { name, description, link, imageUrl, category, isPodcast, resourceType, queryString, medium, nsfw } = parameters;
    const feed = new Feed(Object.assign({ title: name, description: mdToPlainText(description), id: link || webserverUrl, link: link || webserverUrl, image: imageUrl, favicon: webserverUrl + '/client/assets/images/favicon.png', copyright: `All rights reserved, unless otherwise specified in the terms specified at ${webserverUrl}/about` +
            ` and potential licenses granted by each content's rightholder.`, generator: `PeerTube - ${webserverUrl}`, medium: medium || 'video', nsfw: nsfw !== null && nsfw !== void 0 ? nsfw : false, feedLinks: {
            json: `${webserverUrl}/feeds/${resourceType}.json${queryString}`,
            atom: `${webserverUrl}/feeds/${resourceType}.atom${queryString}`,
            rss: isPodcast
                ? `${webserverUrl}/feeds/podcast/videos.xml${queryString}`
                : `${webserverUrl}/feeds/${resourceType}.xml${queryString}`
        } }, pick(parameters, [
        'guid',
        'language',
        'stunServers',
        'trackers',
        'customXMLNS',
        'customTags',
        'author',
        'person',
        'locked'
    ])));
    if (category) {
        feed.addCategory(category);
    }
    return feed;
}
export function sendFeed(feed, req, res) {
    const format = req.params.format;
    if (format === 'atom' || format === 'atom1') {
        return res.send(feed.atom1()).end();
    }
    if (format === 'json' || format === 'json1') {
        return res.send(feed.json1()).end();
    }
    if (format === 'rss' || format === 'rss2') {
        return res.send(feed.rss2()).end();
    }
    if (req.query.format === 'atom' || req.query.format === 'atom1') {
        return res.send(feed.atom1()).end();
    }
    return res.send(feed.rss2()).end();
}
export async function buildFeedMetadata(options) {
    const { video, videoChannel, account } = options;
    let imageUrl = WEBSERVER.URL + '/client/assets/images/icons/icon-96x96.png';
    let ownerImageUrl;
    let name;
    let description;
    let email;
    let link;
    let ownerLink;
    let user;
    if (videoChannel) {
        name = videoChannel.getDisplayName();
        description = videoChannel.description;
        ownerLink = link = videoChannel.getClientUrl();
        if (videoChannel.Actor.hasImage(ActorImageType.AVATAR)) {
            imageUrl = WEBSERVER.URL + videoChannel.Actor.getMaxQualityImage(ActorImageType.AVATAR).getStaticPath();
            ownerImageUrl = imageUrl;
        }
        user = await UserModel.loadById(videoChannel.Account.userId);
    }
    else if (account) {
        name = account.getDisplayName();
        description = account.description;
        ownerLink = link = account.getClientUrl();
        if (account.Actor.hasImage(ActorImageType.AVATAR)) {
            imageUrl = WEBSERVER.URL + account.Actor.getMaxQualityImage(ActorImageType.AVATAR).getStaticPath();
            ownerImageUrl = imageUrl;
        }
        user = await UserModel.loadById(account.userId);
    }
    else if (video) {
        name = video.name;
        description = video.description;
        link = video.url;
    }
    else {
        name = CONFIG.INSTANCE.NAME;
        description = CONFIG.INSTANCE.DESCRIPTION;
        link = WEBSERVER.URL;
    }
    if (user && !user.pluginAuth && user.emailVerified && user.emailPublic) {
        email = user.email;
    }
    return { name, description, imageUrl, ownerImageUrl, email, link, ownerLink };
}
//# sourceMappingURL=common-feed-utils.js.map