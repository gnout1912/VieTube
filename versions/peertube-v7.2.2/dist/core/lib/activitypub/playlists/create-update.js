import { HttpStatusCode } from '@peertube/peertube-models';
import { isArray } from '../../../helpers/custom-validators/misc.js';
import { retryTransactionWrapper } from '../../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { CRAWL_REQUEST_CONCURRENCY } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { updateRemotePlaylistMiniatureFromUrl } from '../../thumbnail.js';
import { VideoPlaylistElementModel } from '../../../models/video/video-playlist-element.js';
import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import Bluebird from 'bluebird';
import { getAPId } from '../activity.js';
import { getOrCreateAPActor } from '../actors/index.js';
import { crawlCollectionPage } from '../crawl.js';
import { checkUrlsSameHost } from '../url.js';
import { getOrCreateAPVideo } from '../videos/index.js';
import { fetchRemotePlaylistElement, fetchRemoteVideoPlaylist, playlistElementObjectToDBAttributes, playlistObjectToDBAttributes } from './shared/index.js';
import { isActivityPubUrlValid } from '../../../helpers/custom-validators/activitypub/misc.js';
const lTags = loggerTagsFactory('ap', 'video-playlist');
export async function createAccountPlaylists(playlistUrls, account) {
    await Bluebird.map(playlistUrls, async (playlistUrl) => {
        if (!checkUrlsSameHost(playlistUrl, account.Actor.url)) {
            logger.warn(`Playlist ${playlistUrl} is not on the same host as owner account ${account.Actor.url}`, lTags(playlistUrl));
            return;
        }
        try {
            const exists = await VideoPlaylistModel.doesPlaylistExist(playlistUrl);
            if (exists === true)
                return;
            const { playlistObject } = await fetchRemoteVideoPlaylist(playlistUrl);
            if (playlistObject === undefined) {
                throw new Error(`Cannot refresh remote playlist ${playlistUrl}: invalid body.`);
            }
            return createOrUpdateVideoPlaylist({ playlistObject, contextUrl: playlistUrl });
        }
        catch (err) {
            logger.warn(`Cannot create or update playlist ${playlistUrl}`, Object.assign({ err }, lTags(playlistUrl)));
        }
    }, { concurrency: CRAWL_REQUEST_CONCURRENCY });
}
export async function createOrUpdateVideoPlaylist(options) {
    const { playlistObject, contextUrl, to } = options;
    if (!checkUrlsSameHost(playlistObject.id, contextUrl)) {
        throw new Error(`Playlist ${playlistObject.id} is not on the same host as context URL ${contextUrl}`);
    }
    const playlistAttributes = playlistObjectToDBAttributes(playlistObject, to || playlistObject.to);
    const channel = await getRemotePlaylistChannel(playlistObject);
    playlistAttributes.videoChannelId = channel.id;
    playlistAttributes.ownerAccountId = channel.accountId;
    const [upsertPlaylist] = await VideoPlaylistModel.upsert(playlistAttributes, { returning: true });
    const playlistElementUrls = await fetchElementUrls(playlistObject);
    const playlist = await VideoPlaylistModel.loadWithAccountAndChannel(upsertPlaylist.id, null);
    await updatePlaylistThumbnail(playlistObject, playlist);
    const elementsLength = await rebuildVideoPlaylistElements(playlistElementUrls, playlist);
    playlist.setVideosLength(elementsLength);
    return playlist;
}
async function getRemotePlaylistChannel(playlistObject) {
    if (!isArray(playlistObject.attributedTo) || playlistObject.attributedTo.length !== 1) {
        throw new Error('Not attributed to for playlist object ' + getAPId(playlistObject));
    }
    const channelUrl = getAPId(playlistObject.attributedTo[0]);
    if (!checkUrlsSameHost(channelUrl, playlistObject.id)) {
        throw new Error(`Playlist ${playlistObject.id} and "attributedTo" channel ${channelUrl} are not on the same host`);
    }
    const actor = await getOrCreateAPActor(channelUrl, 'all');
    if (!actor.VideoChannel) {
        throw new Error(`Playlist ${playlistObject.id} "attributedTo" is not a video channel.`);
    }
    return actor.VideoChannel;
}
async function fetchElementUrls(playlistObject) {
    let accItems = [];
    await crawlCollectionPage(playlistObject.id, items => {
        accItems = accItems.concat(items);
        return Promise.resolve();
    });
    return accItems.filter(i => isActivityPubUrlValid(i));
}
async function updatePlaylistThumbnail(playlistObject, playlist) {
    if (playlistObject.icon) {
        let thumbnailModel;
        try {
            thumbnailModel = await updateRemotePlaylistMiniatureFromUrl({ downloadUrl: playlistObject.icon.url, playlist });
            await playlist.setAndSaveThumbnail(thumbnailModel, undefined);
        }
        catch (err) {
            logger.warn('Cannot set thumbnail of %s.', playlistObject.id, Object.assign({ err }, lTags(playlistObject.id, playlist.uuid, playlist.url)));
            if (thumbnailModel)
                await thumbnailModel.removeThumbnail();
        }
        return;
    }
    if (playlist.hasThumbnail()) {
        await playlist.Thumbnail.destroy();
        playlist.Thumbnail = null;
    }
}
async function rebuildVideoPlaylistElements(elementUrls, playlist) {
    const elementsToCreate = await buildElementsDBAttributes(elementUrls, playlist);
    await retryTransactionWrapper(() => sequelizeTypescript.transaction(async (t) => {
        await VideoPlaylistElementModel.deleteAllOf(playlist.id, t);
        for (const element of elementsToCreate) {
            await VideoPlaylistElementModel.create(element, { transaction: t });
        }
    }));
    logger.info('Rebuilt playlist %s with %s elements.', playlist.url, elementsToCreate.length, lTags(playlist.uuid, playlist.url));
    return elementsToCreate.length;
}
async function buildElementsDBAttributes(elementUrls, playlist) {
    const elementsToCreate = [];
    await Bluebird.map(elementUrls, async (elementUrl) => {
        try {
            const { elementObject } = await fetchRemotePlaylistElement(elementUrl);
            const { video } = await getOrCreateAPVideo({ videoObject: { id: elementObject.url }, fetchType: 'only-video-and-blacklist' });
            elementsToCreate.push(playlistElementObjectToDBAttributes(elementObject, playlist, video));
        }
        catch (err) {
            const logLevel = err.statusCode === HttpStatusCode.UNAUTHORIZED_401
                ? 'debug'
                : 'warn';
            logger.log(logLevel, `Cannot add playlist element ${elementUrl}`, Object.assign({ err }, lTags(playlist.uuid, playlist.url)));
        }
    }, { concurrency: CRAWL_REQUEST_CONCURRENCY });
    return elementsToCreate;
}
//# sourceMappingURL=create-update.js.map