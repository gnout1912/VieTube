import { updateTorrentMetadata } from '../core/helpers/webtorrent.js';
import { getServerActor } from '../core/models/application/application.js';
import { WEBSERVER } from '../core/initializers/constants.js';
import { initDatabaseModels } from '../core/initializers/database.js';
import { getLocalAccountActivityPubUrl, getLocalVideoActivityPubUrl, getLocalVideoAnnounceActivityPubUrl, getLocalVideoChannelActivityPubUrl, getLocalVideoCommentActivityPubUrl, getLocalVideoPlaylistActivityPubUrl, getLocalVideoPlaylistElementActivityPubUrl } from '../core/lib/activitypub/url.js';
import { AccountModel } from '../core/models/account/account.js';
import { ActorFollowModel } from '../core/models/actor/actor-follow.js';
import { ActorModel } from '../core/models/actor/actor.js';
import { VideoChannelModel } from '../core/models/video/video-channel.js';
import { VideoCommentModel } from '../core/models/video/video-comment.js';
import { VideoShareModel } from '../core/models/video/video-share.js';
import { VideoModel } from '../core/models/video/video.js';
import { VideoPlaylistModel } from '../core/models/video/video-playlist.js';
import { VideoPlaylistElementModel } from '../core/models/video/video-playlist-element.js';
run()
    .then(() => process.exit(0))
    .catch(err => {
    console.error(err);
    process.exit(-1);
});
async function run() {
    await initDatabaseModels(true);
    const serverAccount = await getServerActor();
    {
        const res = await ActorFollowModel.listAcceptedFollowingUrlsForApi([serverAccount.id], undefined, 0, 1);
        const hasFollowing = res.total > 0;
        if (hasFollowing === true) {
            throw new Error('Cannot update host because you follow other servers!');
        }
    }
    console.log('Updating actors.');
    const actors = await ActorModel.unscoped().findAll({
        where: {
            serverId: null
        },
        include: [
            {
                model: VideoChannelModel.unscoped(),
                required: false
            },
            {
                model: AccountModel.unscoped(),
                required: false
            }
        ]
    });
    for (const actor of actors) {
        console.log('Updating actor ' + actor.url);
        const newUrl = actor.Account
            ? getLocalAccountActivityPubUrl(actor.preferredUsername)
            : getLocalVideoChannelActivityPubUrl(actor.preferredUsername);
        actor.url = newUrl;
        actor.inboxUrl = newUrl + '/inbox';
        actor.outboxUrl = newUrl + '/outbox';
        actor.sharedInboxUrl = WEBSERVER.URL + '/inbox';
        actor.followersUrl = newUrl + '/followers';
        actor.followingUrl = newUrl + '/following';
        await actor.save();
    }
    console.log('Updating video shares.');
    const videoShares = await VideoShareModel.findAll({
        include: [
            {
                model: VideoModel.unscoped(),
                where: {
                    remote: false
                },
                required: true
            },
            ActorModel.unscoped()
        ]
    });
    for (const videoShare of videoShares) {
        console.log('Updating video share ' + videoShare.url);
        videoShare.url = getLocalVideoAnnounceActivityPubUrl(videoShare.Actor, videoShare.Video);
        await videoShare.save();
    }
    console.log('Updating video comments.');
    const videoComments = await VideoCommentModel.findAll({
        include: [
            {
                model: VideoModel.unscoped()
            },
            {
                model: AccountModel.unscoped(),
                required: true,
                include: [
                    {
                        model: ActorModel.unscoped(),
                        where: {
                            serverId: null
                        },
                        required: true
                    }
                ]
            }
        ]
    });
    for (const comment of videoComments) {
        console.log('Updating comment ' + comment.url);
        comment.url = getLocalVideoCommentActivityPubUrl(comment.Video, comment);
        await comment.save();
    }
    console.log('Updating video playlists.');
    const videoPlaylists = await VideoPlaylistModel.findAll({
        include: [
            {
                model: AccountModel.unscoped(),
                required: true,
                include: [
                    {
                        model: ActorModel.unscoped(),
                        where: {
                            serverId: null
                        },
                        required: true
                    }
                ]
            }
        ]
    });
    for (const playlist of videoPlaylists) {
        console.log('Updating video playlist ' + playlist.url);
        playlist.url = getLocalVideoPlaylistActivityPubUrl(playlist);
        await playlist.save();
        const elements = await VideoPlaylistElementModel.findAll({
            where: {
                videoPlaylistId: playlist.id
            }
        });
        for (const element of elements) {
            console.log('Updating video playlist element ' + element.url);
            element.url = getLocalVideoPlaylistElementActivityPubUrl(playlist, element);
            await element.save();
        }
    }
    console.log('Updating video and torrent files.');
    const ids = await VideoModel.listLocalIds();
    for (const id of ids) {
        const video = await VideoModel.loadFull(id);
        console.log('Updating video ' + video.uuid);
        video.url = getLocalVideoActivityPubUrl(video);
        await video.save();
        for (const file of video.VideoFiles) {
            console.log('Updating torrent file %s of video %s.', file.resolution, video.uuid);
            await updateTorrentMetadata(video, file);
            await file.save();
        }
        const playlist = video.getHLSPlaylist();
        for (const file of ((playlist === null || playlist === void 0 ? void 0 : playlist.VideoFiles) || [])) {
            console.log('Updating fragmented torrent file %s of video %s.', file.resolution, video.uuid);
            await updateTorrentMetadata(playlist, file);
            await file.save();
        }
    }
}
//# sourceMappingURL=update-host.js.map