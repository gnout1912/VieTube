import { escapeHTML, getChannelRSSFeeds, getDefaultRSSFeeds, maxBy } from '@peertube/peertube-core-utils';
import { HttpStatusCode } from '@peertube/peertube-models';
import { WEBSERVER } from '../../../initializers/constants.js';
import { AccountModel } from '../../../models/account/account.js';
import { ActorImageModel } from '../../../models/actor/actor-image.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { CONFIG } from '../../../initializers/config.js';
import { PageHtml } from './page-html.js';
import { TagsHtml } from './tags-html.js';
export class ActorHtml {
    static async getAccountHTMLPage(handle, req, res) {
        const accountModelPromise = AccountModel.loadByHandle(handle);
        return this.getAccountOrChannelHTMLPage({
            loader: () => accountModelPromise,
            getRSSFeeds: () => getDefaultRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME),
            req,
            res
        });
    }
    static async getVideoChannelHTMLPage(handle, req, res) {
        const videoChannel = await VideoChannelModel.loadByHandleAndPopulateAccount(handle);
        return this.getAccountOrChannelHTMLPage({
            loader: () => Promise.resolve(videoChannel),
            getRSSFeeds: () => getChannelRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME, videoChannel),
            req,
            res
        });
    }
    static async getActorHTMLPage(handle, req, res) {
        const [account, channel] = await Promise.all([
            AccountModel.loadByHandle(handle),
            VideoChannelModel.loadByHandleAndPopulateAccount(handle)
        ]);
        return this.getAccountOrChannelHTMLPage({
            loader: () => Promise.resolve(account || channel),
            getRSSFeeds: () => account
                ? getDefaultRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME)
                : getChannelRSSFeeds(WEBSERVER.URL, CONFIG.INSTANCE.NAME, channel),
            req,
            res
        });
    }
    static async getAccountOrChannelHTMLPage(options) {
        const { loader, getRSSFeeds, req, res } = options;
        const [html, entity] = await Promise.all([
            PageHtml.getIndexHTML(req, res),
            loader()
        ]);
        if (!entity) {
            res.status(HttpStatusCode.NOT_FOUND_404);
            return PageHtml.getIndexHTML(req, res);
        }
        const escapedTruncatedDescription = TagsHtml.buildEscapedTruncatedDescription(entity.description);
        let customHTML = TagsHtml.addTitleTag(html, entity.getDisplayName());
        customHTML = TagsHtml.addDescriptionTag(customHTML, escapedTruncatedDescription);
        const url = entity.getClientUrl();
        const siteName = CONFIG.INSTANCE.NAME;
        const title = entity.getDisplayName();
        const avatar = maxBy(entity.Actor.Avatars, 'width');
        const image = {
            url: ActorImageModel.getImageUrl(avatar),
            width: avatar === null || avatar === void 0 ? void 0 : avatar.width,
            height: avatar === null || avatar === void 0 ? void 0 : avatar.height
        };
        const ogType = 'website';
        const twitterCard = 'summary';
        const schemaType = 'ProfilePage';
        customHTML = await TagsHtml.addTags(customHTML, {
            url,
            escapedTitle: escapeHTML(title),
            escapedSiteName: escapeHTML(siteName),
            escapedTruncatedDescription,
            relMe: TagsHtml.findRelMe(entity.description),
            image,
            ogType,
            twitterCard,
            schemaType,
            jsonldProfile: {
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt
            },
            forbidIndexation: !entity.Actor.isOwned(),
            embedIndexation: false,
            rssFeeds: getRSSFeeds(entity)
        }, {});
        return customHTML;
    }
}
//# sourceMappingURL=actor-html.js.map