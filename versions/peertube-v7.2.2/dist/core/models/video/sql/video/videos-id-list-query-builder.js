import { forceNumber } from '@peertube/peertube-core-utils';
import { VideoInclude, VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { exists } from '../../../../helpers/custom-validators/misc.js';
import { WEBSERVER } from '../../../../initializers/constants.js';
import { buildSortDirectionAndField } from '../../../shared/index.js';
import validator from 'validator';
import { AbstractRunQuery } from '../../../shared/abstract-run-query.js';
import { createSafeIn, parseRowCountResult } from '../../../shared/index.js';
export class VideosIdListQueryBuilder extends AbstractRunQuery {
    constructor(sequelize) {
        super(sequelize);
        this.sequelize = sequelize;
        this.replacements = {};
        this.joins = [];
        this.and = [];
        this.cte = [];
        this.group = '';
        this.having = '';
        this.sort = '';
        this.limit = '';
        this.offset = '';
    }
    queryVideoIds(options) {
        this.buildIdsListQuery(options);
        return this.runQuery();
    }
    countVideoIds(countOptions) {
        this.buildIdsListQuery(countOptions);
        return this.runQuery().then(rows => parseRowCountResult(rows));
    }
    getQuery(options) {
        this.buildIdsListQuery(options);
        return {
            query: this.query,
            sort: this.sort,
            replacements: this.replacements,
            queryConfig: this.queryConfig
        };
    }
    buildIdsListQuery(options) {
        this.attributes = options.attributes || ['"video"."id"'];
        if (options.group)
            this.group = options.group;
        if (options.having)
            this.having = options.having;
        this.joins = this.joins.concat([
            'INNER JOIN "videoChannel" ON "videoChannel"."id" = "video"."channelId"',
            'INNER JOIN "account" ON "account"."id" = "videoChannel"."accountId"',
            'INNER JOIN "actor" "accountActor" ON "account"."actorId" = "accountActor"."id"'
        ]);
        if (!(options.include & VideoInclude.BLACKLISTED)) {
            this.whereNotBlacklisted();
        }
        if (options.serverAccountIdForBlock && !(options.include & VideoInclude.BLOCKED_OWNER)) {
            this.whereNotBlocked(options.serverAccountIdForBlock, options.user);
        }
        if (!(options.include & VideoInclude.NOT_PUBLISHED_STATE)) {
            this.whereStateAvailable();
        }
        if (options.videoPlaylistId) {
            this.joinPlaylist(options.videoPlaylistId);
        }
        if (exists(options.isLocal)) {
            this.whereLocal(options.isLocal);
        }
        if (options.host) {
            this.whereHost(options.host);
        }
        if (options.accountId) {
            this.whereAccountId(options.accountId);
        }
        if (options.videoChannelId) {
            this.whereChannelId(options.videoChannelId);
        }
        if (options.channelNameOneOf) {
            this.whereChannelOneOf(options.channelNameOneOf);
        }
        if (options.displayOnlyForFollower) {
            this.whereFollowerActorId(options.displayOnlyForFollower);
        }
        if (options.hasFiles === true) {
            this.whereFileExists();
        }
        if (exists(options.hasWebVideoFiles)) {
            this.whereWebVideoFileExists(options.hasWebVideoFiles);
        }
        if (exists(options.hasHLSFiles)) {
            this.whereHLSFileExists(options.hasHLSFiles);
        }
        if (options.tagsOneOf) {
            this.whereTagsOneOf(options.tagsOneOf);
        }
        if (options.tagsAllOf) {
            this.whereTagsAllOf(options.tagsAllOf);
        }
        if (options.autoTagOneOf) {
            this.whereAutoTagOneOf(options.autoTagOneOf);
        }
        if (options.privacyOneOf) {
            this.wherePrivacyOneOf(options.privacyOneOf);
        }
        else {
            this.wherePrivacyAvailable(options.user);
        }
        if (options.uuids) {
            this.whereUUIDs(options.uuids);
        }
        if (options.nsfw === true) {
            this.whereNSFW(options.nsfwFlagsExcluded);
        }
        else if (options.nsfw === false) {
            this.whereSFW(options.nsfwFlagsIncluded);
        }
        else if (options.nsfwFlagsExcluded) {
            this.whereNSFWFlagsExcluded(options.nsfwFlagsExcluded);
        }
        if (options.isLive === true) {
            this.whereLive();
        }
        else if (options.isLive === false) {
            this.whereVOD();
        }
        if (options.categoryOneOf) {
            this.whereCategoryOneOf(options.categoryOneOf);
        }
        if (options.licenceOneOf) {
            this.whereLicenceOneOf(options.licenceOneOf);
        }
        if (options.languageOneOf) {
            this.whereLanguageOneOf(options.languageOneOf);
        }
        if (options.isCount !== true) {
            if (options.sort.endsWith('trending')) {
                this.groupForTrending(options.trendingDays);
            }
            else if (options.sort.endsWith('hot') || options.sort.endsWith('best')) {
                this.addAttributeForHotOrBest(options.sort, options.user);
            }
        }
        if (options.historyOfUser) {
            this.joinHistory(options.historyOfUser.id);
        }
        if (options.startDate) {
            this.whereStartDate(options.startDate);
        }
        if (options.endDate) {
            this.whereEndDate(options.endDate);
        }
        if (options.originallyPublishedStartDate) {
            this.whereOriginallyPublishedStartDate(options.originallyPublishedStartDate);
        }
        if (options.originallyPublishedEndDate) {
            this.whereOriginallyPublishedEndDate(options.originallyPublishedEndDate);
        }
        if (options.durationMin) {
            this.whereDurationMin(options.durationMin);
        }
        if (options.durationMax) {
            this.whereDurationMax(options.durationMax);
        }
        if (options.excludeAlreadyWatched) {
            if (exists(options.user.id)) {
                this.whereExcludeAlreadyWatched(options.user.id);
            }
            else {
                throw new Error('Cannot use excludeAlreadyWatched parameter when auth token is not provided');
            }
        }
        this.whereSearch(options.search);
        if (options.isCount === true) {
            this.setCountAttribute();
        }
        else {
            if (exists(options.sort)) {
                this.setSort(options.sort);
            }
            if (exists(options.count)) {
                this.setLimit(options.count);
            }
            if (exists(options.start)) {
                this.setOffset(options.start);
            }
        }
        const cteString = this.cte.length !== 0
            ? `WITH ${this.cte.join(', ')} `
            : '';
        this.query = cteString +
            'SELECT ' + this.attributes.join(', ') + ' ' +
            'FROM "video" ' + this.joins.join(' ') + ' ' +
            'WHERE ' + this.and.join(' AND ') + ' ' +
            this.group + ' ' +
            this.having + ' ' +
            this.sort + ' ' +
            this.limit + ' ' +
            this.offset;
    }
    setCountAttribute() {
        this.attributes = ['COUNT(*) as "total"'];
    }
    joinHistory(userId) {
        this.joins.push('INNER JOIN "userVideoHistory" ON "video"."id" = "userVideoHistory"."videoId"');
        this.and.push('"userVideoHistory"."userId" = :historyOfUser');
        this.replacements.historyOfUser = userId;
    }
    joinPlaylist(playlistId) {
        this.joins.push('INNER JOIN "videoPlaylistElement" "video"."id" = "videoPlaylistElement"."videoId" ' +
            'AND "videoPlaylistElement"."videoPlaylistId" = :videoPlaylistId');
        this.replacements.videoPlaylistId = playlistId;
    }
    whereStateAvailable() {
        this.and.push(`("video"."state" = ${VideoState.PUBLISHED} OR ` +
            `("video"."state" = ${VideoState.TO_TRANSCODE} AND "video"."waitTranscoding" IS false))`);
    }
    wherePrivacyAvailable(user) {
        if (user) {
            this.and.push(`("video"."privacy" = ${VideoPrivacy.PUBLIC} OR "video"."privacy" = ${VideoPrivacy.INTERNAL})`);
        }
        else {
            this.and.push(`"video"."privacy" = ${VideoPrivacy.PUBLIC}`);
        }
    }
    whereLocal(isLocal) {
        const isRemote = isLocal ? 'FALSE' : 'TRUE';
        this.and.push('"video"."remote" IS ' + isRemote);
    }
    whereHost(host) {
        if (host === WEBSERVER.HOST) {
            this.and.push('"accountActor"."serverId" IS NULL');
            return;
        }
        this.joins.push('INNER JOIN "server" ON "server"."id" = "accountActor"."serverId"');
        this.and.push('"server"."host" = :host');
        this.replacements.host = host;
    }
    whereAccountId(accountId) {
        this.and.push('"account"."id" = :accountId');
        this.replacements.accountId = accountId;
    }
    whereChannelId(channelId) {
        this.and.push('"videoChannel"."id" = :videoChannelId');
        this.replacements.videoChannelId = channelId;
    }
    whereChannelOneOf(channelOneOf) {
        this.joins.push('INNER JOIN "actor" "channelActor" ON "videoChannel"."actorId" = "channelActor"."id"');
        this.and.push('"channelActor"."preferredUsername" IN (:channelOneOf)');
        this.replacements.channelOneOf = channelOneOf;
    }
    whereFollowerActorId(options) {
        let query = '(' +
            '  EXISTS (' +
            '    SELECT 1 FROM "videoShare" ' +
            '    INNER JOIN "actorFollow" "actorFollowShare" ON "actorFollowShare"."targetActorId" = "videoShare"."actorId" ' +
            '    AND "actorFollowShare"."actorId" = :followerActorId AND "actorFollowShare"."state" = \'accepted\' ' +
            '    WHERE "videoShare"."videoId" = "video"."id"' +
            '  )' +
            '  OR' +
            '  EXISTS (' +
            '    SELECT 1 from "actorFollow" ' +
            '    WHERE ("actorFollow"."targetActorId" = "account"."actorId" OR "actorFollow"."targetActorId" = "videoChannel"."actorId") ' +
            '    AND "actorFollow"."actorId" = :followerActorId ' +
            '    AND "actorFollow"."state" = \'accepted\'' +
            '  )';
        if (options.orLocalVideos) {
            query += '  OR "video"."remote" IS FALSE';
        }
        query += ')';
        this.and.push(query);
        this.replacements.followerActorId = options.actorId;
    }
    whereFileExists() {
        this.and.push(`(${this.buildWebVideoFileExistsQuery(true)} OR ${this.buildHLSFileExistsQuery(true)})`);
    }
    whereWebVideoFileExists(exists) {
        this.and.push(this.buildWebVideoFileExistsQuery(exists));
    }
    whereHLSFileExists(exists) {
        this.and.push(this.buildHLSFileExistsQuery(exists));
    }
    buildWebVideoFileExistsQuery(exists) {
        const prefix = exists ? '' : 'NOT ';
        return prefix + 'EXISTS (SELECT 1 FROM "videoFile" WHERE "videoFile"."videoId" = "video"."id")';
    }
    buildHLSFileExistsQuery(exists) {
        const prefix = exists ? '' : 'NOT ';
        return prefix + 'EXISTS (' +
            '  SELECT 1 FROM "videoStreamingPlaylist" ' +
            '  INNER JOIN "videoFile" ON "videoFile"."videoStreamingPlaylistId" = "videoStreamingPlaylist"."id" ' +
            '  WHERE "videoStreamingPlaylist"."videoId" = "video"."id"' +
            ')';
    }
    whereTagsOneOf(tagsOneOf) {
        const tagsOneOfLower = tagsOneOf.map(t => t.toLowerCase());
        this.cte.push('"tagsOneOf" AS (' +
            '  SELECT "videoTag"."videoId" AS "videoId" FROM "videoTag" ' +
            '  INNER JOIN "tag" ON "tag"."id" = "videoTag"."tagId" ' +
            '  WHERE lower("tag"."name") IN (' + createSafeIn(this.sequelize, tagsOneOfLower) + ') ' +
            ')');
        this.joins.push('INNER JOIN "tagsOneOf" ON "video"."id" = "tagsOneOf"."videoId"');
    }
    whereAutoTagOneOf(autoTagOneOf) {
        const tags = autoTagOneOf.map(t => t.toLowerCase());
        this.cte.push('"autoTagsOneOf" AS (' +
            '  SELECT "videoAutomaticTag"."videoId" AS "videoId" FROM "videoAutomaticTag" ' +
            '  INNER JOIN "automaticTag" ON "automaticTag"."id" = "videoAutomaticTag"."automaticTagId" ' +
            '  WHERE lower("automaticTag"."name") IN (' + createSafeIn(this.sequelize, tags) + ') ' +
            ')');
        this.joins.push('INNER JOIN "autoTagsOneOf" ON "video"."id" = "autoTagsOneOf"."videoId"');
    }
    whereTagsAllOf(tagsAllOf) {
        const tagsAllOfLower = tagsAllOf.map(t => t.toLowerCase());
        this.cte.push('"tagsAllOf" AS (' +
            '  SELECT "videoTag"."videoId" AS "videoId" FROM "videoTag" ' +
            '  INNER JOIN "tag" ON "tag"."id" = "videoTag"."tagId" ' +
            '  WHERE lower("tag"."name") IN (' + createSafeIn(this.sequelize, tagsAllOfLower) + ') ' +
            '  GROUP BY "videoTag"."videoId" HAVING COUNT(*) = ' + tagsAllOfLower.length +
            ')');
        this.joins.push('INNER JOIN "tagsAllOf" ON "video"."id" = "tagsAllOf"."videoId"');
    }
    wherePrivacyOneOf(privacyOneOf) {
        this.and.push('"video"."privacy" IN (:privacyOneOf)');
        this.replacements.privacyOneOf = privacyOneOf;
    }
    whereUUIDs(uuids) {
        this.and.push('"video"."uuid" IN (' + createSafeIn(this.sequelize, uuids) + ')');
    }
    whereCategoryOneOf(categoryOneOf) {
        this.and.push('"video"."category" IN (:categoryOneOf)');
        this.replacements.categoryOneOf = categoryOneOf;
    }
    whereLicenceOneOf(licenceOneOf) {
        this.and.push('"video"."licence" IN (:licenceOneOf)');
        this.replacements.licenceOneOf = licenceOneOf;
    }
    whereLanguageOneOf(languageOneOf) {
        const languages = languageOneOf.filter(l => l && l !== '_unknown');
        const languagesQueryParts = [];
        if (languages.length !== 0) {
            languagesQueryParts.push('"video"."language" IN (:languageOneOf)');
            this.replacements.languageOneOf = languages;
            languagesQueryParts.push('EXISTS (' +
                '  SELECT 1 FROM "videoCaption" WHERE "videoCaption"."language" ' +
                '  IN (' + createSafeIn(this.sequelize, languages) + ') AND ' +
                '  "videoCaption"."videoId" = "video"."id"' +
                ')');
        }
        if (languageOneOf.includes('_unknown')) {
            languagesQueryParts.push('"video"."language" IS NULL');
        }
        if (languagesQueryParts.length !== 0) {
            this.and.push('(' + languagesQueryParts.join(' OR ') + ')');
        }
    }
    whereNSFW(nsfwFlagsExcluded) {
        let filter = '"video"."nsfw" IS TRUE';
        if (nsfwFlagsExcluded) {
            filter += ' AND "video"."nsfwFlags" & :nsfwFlagsExcluded = 0';
            this.replacements.nsfwFlagsExcluded = nsfwFlagsExcluded;
        }
        this.and.push(filter);
    }
    whereSFW(nsfwFlagsIncluded) {
        let filter = '"video"."nsfw" IS FALSE';
        if (nsfwFlagsIncluded) {
            filter = `(${filter} OR "video"."nsfwFlags" & :nsfwFlagsIncluded != 0)`;
            this.replacements.nsfwFlagsIncluded = nsfwFlagsIncluded;
        }
        this.and.push(filter);
    }
    whereNSFWFlagsExcluded(nsfwFlagsExcluded) {
        this.and.push('"video"."nsfwFlags" & :nsfwFlagsExcluded = 0');
        this.replacements.nsfwFlagsExcluded = nsfwFlagsExcluded;
    }
    whereLive() {
        this.and.push('"video"."isLive" IS TRUE');
    }
    whereVOD() {
        this.and.push('"video"."isLive" IS FALSE');
    }
    whereNotBlocked(serverAccountId, user) {
        const blockerIds = [serverAccountId];
        if (user)
            blockerIds.push(user.Account.id);
        const inClause = createSafeIn(this.sequelize, blockerIds);
        this.and.push('NOT EXISTS (' +
            '  SELECT 1 FROM "accountBlocklist" ' +
            '  WHERE "accountBlocklist"."accountId" IN (' + inClause + ') ' +
            '  AND "accountBlocklist"."targetAccountId" = "account"."id" ' +
            ')' +
            'AND NOT EXISTS (' +
            '  SELECT 1 FROM "serverBlocklist" WHERE "serverBlocklist"."accountId" IN (' + inClause + ') ' +
            '  AND "serverBlocklist"."targetServerId" = "accountActor"."serverId"' +
            ')');
    }
    whereSearch(search) {
        if (!search) {
            this.attributes.push('0 as similarity');
            return;
        }
        const escapedSearch = this.sequelize.escape(search);
        const escapedLikeSearch = this.sequelize.escape('%' + search + '%');
        this.queryConfig = 'SET pg_trgm.word_similarity_threshold = 0.40;';
        this.cte.push('"trigramSearch" AS (' +
            '  SELECT "video"."id", ' +
            `  word_similarity(lower(immutable_unaccent(${escapedSearch})), lower(immutable_unaccent("video"."name"))) as similarity ` +
            '  FROM "video" ' +
            '  WHERE lower(immutable_unaccent(' + escapedSearch + ')) <% lower(immutable_unaccent("video"."name")) OR ' +
            '        lower(immutable_unaccent("video"."name")) LIKE lower(immutable_unaccent(' + escapedLikeSearch + '))' +
            ')');
        this.joins.push('LEFT JOIN "trigramSearch" ON "video"."id" = "trigramSearch"."id"');
        let base = '(' +
            '  "trigramSearch"."id" IS NOT NULL OR ' +
            '  EXISTS (' +
            '    SELECT 1 FROM "videoTag" ' +
            '    INNER JOIN "tag" ON "tag"."id" = "videoTag"."tagId" ' +
            `    WHERE lower("tag"."name") = lower(${escapedSearch}) ` +
            '    AND "video"."id" = "videoTag"."videoId"' +
            '  )';
        if (validator.default.isUUID(search)) {
            base += ` OR "video"."uuid" = ${escapedSearch}`;
        }
        base += ')';
        this.and.push(base);
        let attribute = `COALESCE("trigramSearch"."similarity", 0)`;
        if (this.group)
            attribute = `AVG(${attribute})`;
        this.attributes.push(`${attribute} as similarity`);
    }
    whereNotBlacklisted() {
        this.and.push('"video"."id" NOT IN (SELECT "videoBlacklist"."videoId" FROM "videoBlacklist")');
    }
    whereStartDate(startDate) {
        this.and.push('"video"."publishedAt" >= :startDate');
        this.replacements.startDate = startDate;
    }
    whereEndDate(endDate) {
        this.and.push('"video"."publishedAt" <= :endDate');
        this.replacements.endDate = endDate;
    }
    whereOriginallyPublishedStartDate(startDate) {
        this.and.push('"video"."originallyPublishedAt" >= :originallyPublishedStartDate');
        this.replacements.originallyPublishedStartDate = startDate;
    }
    whereOriginallyPublishedEndDate(endDate) {
        this.and.push('"video"."originallyPublishedAt" <= :originallyPublishedEndDate');
        this.replacements.originallyPublishedEndDate = endDate;
    }
    whereDurationMin(durationMin) {
        this.and.push('"video"."duration" >= :durationMin');
        this.replacements.durationMin = durationMin;
    }
    whereDurationMax(durationMax) {
        this.and.push('"video"."duration" <= :durationMax');
        this.replacements.durationMax = durationMax;
    }
    whereExcludeAlreadyWatched(userId) {
        this.and.push('NOT EXISTS (' +
            '  SELECT 1' +
            '  FROM "userVideoHistory"' +
            '  WHERE "video"."id" = "userVideoHistory"."videoId"' +
            '  AND "userVideoHistory"."userId" = :excludeAlreadyWatchedUserId' +
            ')');
        this.replacements.excludeAlreadyWatchedUserId = userId;
    }
    groupForTrending(trendingDays) {
        const viewsGteDate = new Date(new Date().getTime() - (24 * 3600 * 1000) * trendingDays);
        this.joins.push('LEFT JOIN "videoView" ON "video"."id" = "videoView"."videoId" AND "videoView"."startDate" >= :viewsGteDate');
        this.replacements.viewsGteDate = viewsGteDate;
        this.attributes.push('COALESCE(SUM("videoView"."views"), 0) AS "score"');
        this.group = 'GROUP BY "video"."id"';
    }
    addAttributeForHotOrBest(sort, user) {
        const weights = {
            like: 3 * 50,
            dislike: -3 * 50,
            view: Math.floor((1 / 3) * 50),
            comment: 2 * 50,
            history: -2 * 50
        };
        let attribute = `LOG(GREATEST(1, "video"."likes" - 1)) * ${weights.like} ` +
            `+ LOG(GREATEST(1, "video"."dislikes" - 1)) * ${weights.dislike} ` +
            `+ LOG("video"."views" + 1) * ${weights.view} ` +
            `+ LOG(GREATEST(1, "video"."comments")) * ${weights.comment} ` +
            '+ (SELECT (EXTRACT(epoch FROM "video"."publishedAt") - 1446156582) / 47000) ';
        if (sort.endsWith('best') && user) {
            this.joins.push('LEFT JOIN "userVideoHistory" ON "video"."id" = "userVideoHistory"."videoId" AND "userVideoHistory"."userId" = :bestUser');
            this.replacements.bestUser = user.id;
            attribute += `+ POWER(CASE WHEN "userVideoHistory"."id" IS NULL THEN 0 ELSE 1 END, 2.0) * ${weights.history} `;
        }
        attribute += 'AS "score"';
        this.attributes.push(attribute);
    }
    setSort(sort) {
        if (sort === '-originallyPublishedAt' || sort === 'originallyPublishedAt') {
            this.attributes.push('COALESCE("video"."originallyPublishedAt", "video"."publishedAt") AS "publishedAtForOrder"');
        }
        if (sort === '-localVideoFilesSize' || sort === 'localVideoFilesSize') {
            this.attributes.push('(' +
                'CASE ' +
                'WHEN "video"."remote" IS TRUE THEN 0 ' +
                'ELSE (' +
                '(SELECT COALESCE(SUM(size), 0) FROM "videoFile" WHERE "videoFile"."videoId" = "video"."id")' +
                ' + ' +
                '(' +
                'SELECT COALESCE(SUM(size), 0) FROM "videoFile" ' +
                'INNER JOIN "videoStreamingPlaylist" ON "videoStreamingPlaylist"."id" = "videoFile"."videoStreamingPlaylistId" ' +
                'AND "videoStreamingPlaylist"."videoId" = "video"."id"' +
                ')' +
                ' + ' +
                '(' +
                'SELECT COALESCE(SUM(size), 0) FROM "videoSource" ' +
                'WHERE "videoSource"."videoId" = "video"."id" AND "videoSource"."storage" IS NOT NULL' +
                ')' +
                ') END' +
                ') AS "localVideoFilesSize"');
        }
        this.sort = this.buildOrder(sort);
    }
    buildOrder(value) {
        const { direction, field } = buildSortDirectionAndField(value);
        if (field.match(/^[a-zA-Z."]+$/) === null)
            throw new Error('Invalid sort column ' + field);
        if (field.toLowerCase() === 'random')
            return 'ORDER BY RANDOM()';
        if (field.toLowerCase() === 'total')
            return `ORDER BY "total" ${direction}`;
        if (['trending', 'hot', 'best'].includes(field.toLowerCase())) {
            return `ORDER BY "score" ${direction}, "video"."views" ${direction}`;
        }
        let firstSort;
        if (field.toLowerCase() === 'match') {
            firstSort = '"similarity"';
        }
        else if (field === 'originallyPublishedAt') {
            firstSort = '"publishedAtForOrder"';
        }
        else if (field === 'localVideoFilesSize') {
            firstSort = '"localVideoFilesSize"';
        }
        else if (field.includes('.')) {
            firstSort = field;
        }
        else {
            firstSort = `"video"."${field}"`;
        }
        return `ORDER BY ${firstSort} ${direction}, "video"."id" ASC`;
    }
    setLimit(countArg) {
        const count = forceNumber(countArg);
        this.limit = `LIMIT ${count}`;
    }
    setOffset(startArg) {
        const start = forceNumber(startArg);
        this.offset = `OFFSET ${start}`;
    }
}
//# sourceMappingURL=videos-id-list-query-builder.js.map