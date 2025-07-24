import { literal, Sequelize } from 'sequelize';
export function getSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildSortDirectionAndField(value);
    let finalField;
    if (field.toLowerCase() === 'match') {
        finalField = Sequelize.col('similarity');
    }
    else {
        finalField = field;
    }
    return [[finalField, direction], lastSort];
}
export function getAdminUsersSort(value) {
    const { direction, field } = buildSortDirectionAndField(value);
    let finalField;
    if (field === 'videoQuotaUsed') {
        finalField = Sequelize.col('videoQuotaUsed');
    }
    else {
        finalField = field;
    }
    const nullPolicy = direction === 'ASC'
        ? 'NULLS FIRST'
        : 'NULLS LAST';
    return [[finalField, direction, nullPolicy], ['id', 'ASC']];
}
export function getPlaylistSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildSortDirectionAndField(value);
    if (field.toLowerCase() === 'name') {
        return [['displayName', direction], lastSort];
    }
    return getSort(value, lastSort);
}
export function getVideoSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildSortDirectionAndField(value);
    if (field.toLowerCase() === 'trending') {
        return [
            [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('VideoViews.views')), '0'), direction],
            [Sequelize.col('VideoModel.views'), direction],
            lastSort
        ];
    }
    else if (field === 'publishedAt') {
        return [
            ['ScheduleVideoUpdate', 'updateAt', direction + ' NULLS LAST'],
            [Sequelize.col('VideoModel.publishedAt'), direction],
            lastSort
        ];
    }
    let finalField;
    if (field.toLowerCase() === 'match') {
        finalField = Sequelize.col('similarity');
    }
    else {
        finalField = field;
    }
    const firstSort = typeof finalField === 'string'
        ? finalField.split('.').concat([direction])
        : [finalField, direction];
    return [firstSort, lastSort];
}
export function getBlacklistSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildSortDirectionAndField(value);
    const videoFields = new Set(['name', 'duration', 'views', 'likes', 'dislikes', 'uuid']);
    if (videoFields.has(field)) {
        return [
            [literal(`"Video.${field}" ${direction}`)],
            lastSort
        ];
    }
    return getSort(value, lastSort);
}
export function getInstanceFollowsSort(value, lastSort = ['id', 'ASC']) {
    const { direction, field } = buildSortDirectionAndField(value);
    if (field === 'redundancyAllowed') {
        return [
            ['ActorFollowing.Server.redundancyAllowed', direction],
            lastSort
        ];
    }
    return getSort(value, lastSort);
}
export function getChannelSyncSort(value) {
    const { direction, field } = buildSortDirectionAndField(value);
    if (field.toLowerCase() === 'videochannel') {
        return [
            [literal('"VideoChannel.name"'), direction]
        ];
    }
    return [[field, direction]];
}
export function getSubscriptionSort(value) {
    const { direction, field } = buildSortDirectionAndField(value);
    if (field === 'channelUpdatedAt') {
        return [
            [literal('"ActorFollowing.VideoChannel.updatedAt"'), direction]
        ];
    }
    return [[field, direction]];
}
export function buildSortDirectionAndField(value) {
    let field;
    let direction;
    if (value.startsWith('-')) {
        direction = 'DESC';
        field = value.substring(1);
    }
    else {
        direction = 'ASC';
        field = value;
    }
    return { direction, field };
}
//# sourceMappingURL=sort.js.map