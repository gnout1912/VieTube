import { ActorImageModel } from '../../../models/actor/actor-image.js';
import { AbstractUserExporter } from './abstract-user-exporter.js';
import { ActorImageType } from '@peertube/peertube-models';
import { extname, join } from 'path';
import { createReadStream } from 'fs';
export class ActorExporter extends AbstractUserExporter {
    exportActorJSON(actor) {
        return {
            url: actor.url,
            name: actor.preferredUsername,
            avatars: actor.hasImage(ActorImageType.AVATAR)
                ? this.exportActorImageJSON(actor.Avatars)
                : [],
            banners: actor.hasImage(ActorImageType.BANNER)
                ? this.exportActorImageJSON(actor.Banners)
                : []
        };
    }
    exportActorImageJSON(images) {
        return images.map(i => ({
            width: i.width,
            url: ActorImageModel.getImageUrl(i),
            createdAt: i.createdAt.toISOString(),
            updatedAt: i.updatedAt.toISOString()
        }));
    }
    exportActorFiles(actor) {
        const staticFiles = [];
        const relativePathsFromJSON = {
            avatar: null,
            banner: null
        };
        const toProcess = [
            {
                archivePathBuilder: (filename) => this.getBannerPath(actor, filename),
                type: ActorImageType.BANNER
            },
            {
                archivePathBuilder: (filename) => this.getAvatarPath(actor, filename),
                type: ActorImageType.AVATAR
            }
        ];
        for (const { archivePathBuilder, type } of toProcess) {
            if (!actor.hasImage(type))
                continue;
            const image = actor.getMaxQualityImage(type);
            staticFiles.push({
                archivePath: archivePathBuilder(image.filename),
                readStreamFactory: () => Promise.resolve(createReadStream(image.getPath()))
            });
            const relativePath = join(this.relativeStaticDirPath, archivePathBuilder(image.filename));
            if (type === ActorImageType.AVATAR)
                relativePathsFromJSON.avatar = relativePath;
            else if (type === ActorImageType.BANNER)
                relativePathsFromJSON.banner = relativePath;
        }
        return { staticFiles, relativePathsFromJSON };
    }
    getAvatarPath(actor, filename) {
        return join('avatars', actor.preferredUsername + extname(filename));
    }
    getBannerPath(actor, filename) {
        return join('banners', actor.preferredUsername + extname(filename));
    }
}
//# sourceMappingURL=actor-exporter.js.map