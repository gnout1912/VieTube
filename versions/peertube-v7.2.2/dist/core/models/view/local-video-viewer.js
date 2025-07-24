var LocalVideoViewerModel_1;
import { __decorate, __metadata } from "tslib";
import { getActivityStreamDuration } from '../../lib/activitypub/activity.js';
import { buildGroupByAndBoundaries } from '../../lib/timeserie.js';
import { QueryTypes } from 'sequelize';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, Default, ForeignKey, HasMany, IsUUID, Table } from 'sequelize-typescript';
import { SequelizeModel } from '../shared/index.js';
import { VideoModel } from '../video/video.js';
import { LocalVideoViewerWatchSectionModel } from './local-video-viewer-watch-section.js';
let LocalVideoViewerModel = LocalVideoViewerModel_1 = class LocalVideoViewerModel extends SequelizeModel {
    static loadByUrl(url) {
        return this.findOne({
            where: {
                url
            }
        });
    }
    static loadFullById(id) {
        return this.findOne({
            include: [
                {
                    model: VideoModel.unscoped(),
                    required: true
                },
                {
                    model: LocalVideoViewerWatchSectionModel.unscoped(),
                    required: true
                }
            ],
            where: {
                id
            }
        });
    }
    static async getOverallStats(options) {
        const { video, startDate, endDate } = options;
        const queryOptions = {
            type: QueryTypes.SELECT,
            replacements: { videoId: video.id }
        };
        if (startDate)
            queryOptions.replacements.startDate = startDate;
        if (endDate)
            queryOptions.replacements.endDate = endDate;
        const buildTotalViewersPromise = () => {
            let totalViewersDateWhere = '';
            if (startDate)
                totalViewersDateWhere += ' AND "localVideoViewer"."endDate" >= :startDate';
            if (endDate)
                totalViewersDateWhere += ' AND "localVideoViewer"."startDate" <= :endDate';
            const totalViewersQuery = `SELECT ` +
                `COUNT("localVideoViewer"."id") AS "totalViewers" ` +
                `FROM "localVideoViewer" ` +
                `WHERE "videoId" = :videoId ${totalViewersDateWhere}`;
            return LocalVideoViewerModel_1.sequelize.query(totalViewersQuery, queryOptions);
        };
        const buildWatchTimePromise = () => {
            let watchTimeDateWhere = '';
            if (startDate)
                watchTimeDateWhere += ' AND "localVideoViewer"."startDate" >= :startDate';
            if (endDate)
                watchTimeDateWhere += ' AND "localVideoViewer"."endDate" <= :endDate';
            const watchTimeQuery = `SELECT ` +
                `SUM("localVideoViewer"."watchTime") AS "totalWatchTime", ` +
                `AVG("localVideoViewer"."watchTime") AS "averageWatchTime" ` +
                `FROM "localVideoViewer" ` +
                `WHERE "videoId" = :videoId ${watchTimeDateWhere}`;
            return LocalVideoViewerModel_1.sequelize.query(watchTimeQuery, queryOptions);
        };
        const buildWatchPeakPromise = () => {
            let watchPeakDateWhereStart = '';
            let watchPeakDateWhereEnd = '';
            if (startDate) {
                watchPeakDateWhereStart += ' AND "localVideoViewer"."startDate" >= :startDate';
                watchPeakDateWhereEnd += ' AND "localVideoViewer"."endDate" >= :startDate';
            }
            if (endDate) {
                watchPeakDateWhereStart += ' AND "localVideoViewer"."startDate" <= :endDate';
                watchPeakDateWhereEnd += ' AND "localVideoViewer"."endDate" <= :endDate';
            }
            const beforeWatchersQuery = startDate
                ? `SELECT COUNT(*) AS "total" FROM "localVideoViewer" WHERE "localVideoViewer"."startDate" < :startDate AND "localVideoViewer"."endDate" >= :startDate`
                : `SELECT 0 AS "total"`;
            const watchPeakQuery = `WITH
        "beforeWatchers" AS (${beforeWatchersQuery}),
        "watchPeakValues" AS (
          SELECT "startDate" AS "dateBreakpoint", 1 AS "inc"
          FROM "localVideoViewer"
          WHERE "videoId" = :videoId ${watchPeakDateWhereStart}
          UNION ALL
          SELECT "endDate" AS "dateBreakpoint", -1 AS "inc"
          FROM "localVideoViewer"
          WHERE "videoId" = :videoId ${watchPeakDateWhereEnd}
        )
        SELECT "dateBreakpoint", "concurrent"
        FROM (
          SELECT "dateBreakpoint", SUM(SUM("inc")) OVER (ORDER BY "dateBreakpoint") + (SELECT "total" FROM "beforeWatchers") AS "concurrent"
          FROM "watchPeakValues"
          GROUP BY "dateBreakpoint"
        ) tmp
        ORDER BY "concurrent" DESC
        FETCH FIRST 1 ROW ONLY`;
            return LocalVideoViewerModel_1.sequelize.query(watchPeakQuery, queryOptions);
        };
        const [rowsTotalViewers, rowsWatchTime, rowsWatchPeak, rowsCountries, rowsSubdivisions] = await Promise.all([
            buildTotalViewersPromise(),
            buildWatchTimePromise(),
            buildWatchPeakPromise(),
            LocalVideoViewerModel_1.buildGroupBy({ groupByColumn: 'country', startDate, endDate, videoId: video.id }),
            LocalVideoViewerModel_1.buildGroupBy({ groupByColumn: 'subdivisionName', startDate, endDate, videoId: video.id })
        ]);
        const viewersPeak = rowsWatchPeak.length !== 0
            ? parseInt(rowsWatchPeak[0].concurrent) || 0
            : 0;
        return {
            totalWatchTime: rowsWatchTime.length !== 0
                ? Math.round(rowsWatchTime[0].totalWatchTime) || 0
                : 0,
            averageWatchTime: rowsWatchTime.length !== 0
                ? Math.round(rowsWatchTime[0].averageWatchTime) || 0
                : 0,
            totalViewers: rowsTotalViewers.length !== 0
                ? Math.round(rowsTotalViewers[0].totalViewers) || 0
                : 0,
            viewersPeak,
            viewersPeakDate: rowsWatchPeak.length !== 0 && viewersPeak !== 0
                ? rowsWatchPeak[0].dateBreakpoint || null
                : null,
            countries: rowsCountries.map(r => ({
                isoCode: r.country,
                viewers: r.viewers
            })),
            subdivisions: rowsSubdivisions.map(r => ({
                name: r.subdivisionName,
                viewers: r.viewers
            }))
        };
    }
    static async getUserAgentStats(options) {
        const { video, startDate, endDate } = options;
        const [clients, devices, operatingSystems] = await Promise.all([
            LocalVideoViewerModel_1.buildGroupBy({ groupByColumn: 'client', startDate, endDate, videoId: video.id }),
            LocalVideoViewerModel_1.buildGroupBy({ groupByColumn: 'device', startDate, endDate, videoId: video.id }),
            LocalVideoViewerModel_1.buildGroupBy({ groupByColumn: 'operatingSystem', startDate, endDate, videoId: video.id })
        ]);
        return {
            clients: clients.map(r => ({
                name: r.client,
                viewers: r.viewers
            })),
            devices: devices.map(r => ({
                name: r.device,
                viewers: r.viewers
            })),
            operatingSystems: operatingSystems.map(r => ({
                name: r.operatingSystem,
                viewers: r.viewers
            }))
        };
    }
    static async getRetentionStats(video) {
        const step = Math.max(Math.round(video.duration / 100), 1);
        const query = `WITH "total" AS (SELECT COUNT(*) AS viewers FROM "localVideoViewer" WHERE "videoId" = :videoId) ` +
            `SELECT serie AS "second", ` +
            `(COUNT("localVideoViewer".id)::float / (SELECT GREATEST("total"."viewers", 1) FROM "total")) AS "retention" ` +
            `FROM generate_series(0, ${video.duration}, ${step}) serie ` +
            `LEFT JOIN "localVideoViewer" ON "localVideoViewer"."videoId" = :videoId ` +
            `AND EXISTS (` +
            `SELECT 1 FROM "localVideoViewerWatchSection" ` +
            `WHERE "localVideoViewer"."id" = "localVideoViewerWatchSection"."localVideoViewerId" ` +
            `AND serie >= "localVideoViewerWatchSection"."watchStart" ` +
            `AND serie <= "localVideoViewerWatchSection"."watchEnd"` +
            `)` +
            `GROUP BY serie ` +
            `ORDER BY serie ASC`;
        const queryOptions = {
            type: QueryTypes.SELECT,
            replacements: { videoId: video.id }
        };
        const rows = await LocalVideoViewerModel_1.sequelize.query(query, queryOptions);
        return {
            data: rows.map(r => ({
                second: r.second,
                retentionPercent: parseFloat(r.retention) * 100
            }))
        };
    }
    static async getTimeserieStats(options) {
        const { video, metric } = options;
        const { groupInterval, startDate, endDate } = buildGroupByAndBoundaries(options.startDate, options.endDate);
        const selectMetrics = {
            viewers: 'COUNT("localVideoViewer"."id")',
            aggregateWatchTime: 'SUM("localVideoViewer"."watchTime")'
        };
        const intervalWhere = {
            viewers: '"localVideoViewer"."startDate" <= "intervals"."endDate" ' +
                'AND "localVideoViewer"."endDate" >= "intervals"."startDate"',
            aggregateWatchTime: '"localVideoViewer"."endDate" >= "intervals"."startDate" ' +
                'AND "localVideoViewer"."endDate" <= "intervals"."endDate"'
        };
        const query = `WITH "intervals" AS (
      SELECT
        "time" AS "startDate", "time" + :groupInterval::interval as "endDate"
      FROM
        generate_series(:startDate::timestamptz, :endDate::timestamptz, :groupInterval::interval) serie("time")
    )
    SELECT "intervals"."startDate" as "date", COALESCE(${selectMetrics[metric]}, 0) AS value
    FROM
      intervals
      LEFT JOIN "localVideoViewer" ON "localVideoViewer"."videoId" = :videoId
        AND ${intervalWhere[metric]}
    GROUP BY
      "intervals"."startDate"
    ORDER BY
      "intervals"."startDate"`;
        const queryOptions = {
            type: QueryTypes.SELECT,
            replacements: {
                startDate,
                endDate,
                groupInterval,
                videoId: video.id
            }
        };
        const rows = await LocalVideoViewerModel_1.sequelize.query(query, queryOptions);
        return {
            groupInterval,
            data: rows.map(r => ({
                date: r.date,
                value: parseInt(r.value)
            }))
        };
    }
    static async buildGroupBy(options) {
        const { groupByColumn, startDate, endDate, videoId } = options;
        const queryOptions = {
            type: QueryTypes.SELECT,
            replacements: { videoId, startDate, endDate }
        };
        let dateWhere = '';
        if (startDate)
            dateWhere += ' AND "localVideoViewer"."endDate" >= :startDate';
        if (endDate)
            dateWhere += ' AND "localVideoViewer"."startDate" <= :endDate';
        const query = `SELECT "${groupByColumn}", COUNT("${groupByColumn}") as viewers ` +
            `FROM "localVideoViewer" ` +
            `WHERE "videoId" = :videoId AND "${groupByColumn}" IS NOT NULL ${dateWhere} ` +
            `GROUP BY "${groupByColumn}" ` +
            `ORDER BY "viewers" DESC`;
        return LocalVideoViewerModel_1.sequelize.query(query, queryOptions);
    }
    toActivityPubObject() {
        const location = this.country
            ? {
                location: {
                    addressCountry: this.country,
                    addressRegion: this.subdivisionName
                }
            }
            : {};
        return Object.assign({ id: this.url, type: 'WatchAction', duration: getActivityStreamDuration(this.watchTime), startTime: this.startDate.toISOString(), endTime: this.endDate.toISOString(), object: this.Video.url, uuid: this.uuid, actionStatus: 'CompletedActionStatus', watchSections: this.WatchSections.map(w => ({
                startTimestamp: w.watchStart,
                endTimestamp: w.watchEnd
            })) }, location);
    }
};
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], LocalVideoViewerModel.prototype, "createdAt", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], LocalVideoViewerModel.prototype, "startDate", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.DATE),
    __metadata("design:type", Date)
], LocalVideoViewerModel.prototype, "endDate", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", Number)
], LocalVideoViewerModel.prototype, "watchTime", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "client", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "device", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "operatingSystem", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "country", void 0);
__decorate([
    AllowNull(true),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "subdivisionName", void 0);
__decorate([
    AllowNull(false),
    Default(DataType.UUIDV4),
    IsUUID(4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "uuid", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], LocalVideoViewerModel.prototype, "url", void 0);
__decorate([
    ForeignKey(() => VideoModel),
    Column,
    __metadata("design:type", Number)
], LocalVideoViewerModel.prototype, "videoId", void 0);
__decorate([
    BelongsTo(() => VideoModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], LocalVideoViewerModel.prototype, "Video", void 0);
__decorate([
    HasMany(() => LocalVideoViewerWatchSectionModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'cascade'
    }),
    __metadata("design:type", Array)
], LocalVideoViewerModel.prototype, "WatchSections", void 0);
LocalVideoViewerModel = LocalVideoViewerModel_1 = __decorate([
    Table({
        tableName: 'localVideoViewer',
        updatedAt: false,
        indexes: [
            {
                fields: ['videoId']
            },
            {
                fields: ['url'],
                unique: true
            }
        ]
    })
], LocalVideoViewerModel);
export { LocalVideoViewerModel };
//# sourceMappingURL=local-video-viewer.js.map