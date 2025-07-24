import { AbstractUserExporter } from './abstract-user-exporter.js';
import { VideoPlaylistModel } from '../../../models/video/video-playlist.js';
import { VideoPlaylistElementModel } from '../../../models/video/video-playlist-element.js';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
export class VideoPlaylistsExporter extends AbstractUserExporter {
    async export() {
        var _a, _b, _c;
        const playlistsJSON = [];
        const staticFiles = [];
        const playlists = await VideoPlaylistModel.listPlaylistForExport(this.user.Account.id);
        for (const playlist of playlists) {
            const elements = await VideoPlaylistElementModel.listElementsForExport(playlist.id);
            const archiveFiles = {
                thumbnail: null
            };
            if (playlist.hasThumbnail()) {
                const thumbnail = playlist.Thumbnail;
                staticFiles.push({
                    archivePath: this.getArchiveThumbnailPath(playlist, thumbnail),
                    readStreamFactory: () => Promise.resolve(createReadStream(thumbnail.getPath()))
                });
                archiveFiles.thumbnail = join(this.relativeStaticDirPath, this.getArchiveThumbnailPath(playlist, thumbnail));
            }
            playlistsJSON.push({
                displayName: playlist.name,
                description: playlist.description,
                privacy: playlist.privacy,
                url: playlist.url,
                uuid: playlist.uuid,
                type: playlist.type,
                channel: {
                    name: (_b = (_a = playlist.VideoChannel) === null || _a === void 0 ? void 0 : _a.Actor) === null || _b === void 0 ? void 0 : _b.preferredUsername
                },
                createdAt: playlist.createdAt.toISOString(),
                updatedAt: playlist.updatedAt.toISOString(),
                thumbnailUrl: (_c = playlist.Thumbnail) === null || _c === void 0 ? void 0 : _c.getOriginFileUrl(playlist),
                elements: elements.map(e => ({
                    videoUrl: e.Video.url,
                    startTimestamp: e.startTimestamp,
                    stopTimestamp: e.stopTimestamp
                })),
                archiveFiles
            });
        }
        return {
            json: {
                videoPlaylists: playlistsJSON
            },
            staticFiles
        };
    }
    getArchiveThumbnailPath(playlist, thumbnail) {
        return join('thumbnails', playlist.uuid + extname(thumbnail.filename));
    }
}
//# sourceMappingURL=video-playlists-exporter.js.map