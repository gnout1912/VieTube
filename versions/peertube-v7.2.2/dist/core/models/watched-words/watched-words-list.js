var WatchedWordsListModel_1;
import { __decorate, __metadata } from "tslib";
import { logger } from '../../helpers/logger.js';
import { wordsToRegExp } from '../../helpers/regexp.js';
import { LRUCache } from 'lru-cache';
import { AllowNull, BelongsTo, Column, CreatedAt, DataType, ForeignKey, Table, UpdatedAt } from 'sequelize-typescript';
import { LRU_CACHE, USER_EXPORT_MAX_ITEMS } from '../../initializers/constants.js';
import { AccountModel } from '../account/account.js';
import { SequelizeModel, getSort } from '../shared/index.js';
let WatchedWordsListModel = WatchedWordsListModel_1 = class WatchedWordsListModel extends SequelizeModel {
    static load(options) {
        const { id, accountId } = options;
        const query = {
            where: { id, accountId }
        };
        return this.findOne(query);
    }
    static loadByListName(options) {
        const { listName, accountId } = options;
        const query = {
            where: { listName, accountId }
        };
        return this.findOne(query);
    }
    static listNamesOf(account) {
        const query = {
            raw: true,
            attributes: ['listName'],
            where: { accountId: account.id }
        };
        return WatchedWordsListModel_1.findAll(query)
            .then(rows => rows.map(r => r.listName));
    }
    static listForAPI(options) {
        const { accountId, start, count, sort } = options;
        const query = {
            offset: start,
            limit: count,
            order: getSort(sort),
            where: { accountId }
        };
        return Promise.all([
            WatchedWordsListModel_1.count(query),
            WatchedWordsListModel_1.findAll(query)
        ]).then(([total, data]) => ({ total, data }));
    }
    static listForExport(options) {
        const { accountId } = options;
        return WatchedWordsListModel_1.findAll({
            limit: USER_EXPORT_MAX_ITEMS,
            order: getSort('createdAt'),
            where: { accountId }
        });
    }
    static async buildWatchedWordsRegexp(options) {
        const { accountId, transaction } = options;
        if (WatchedWordsListModel_1.regexCache.has(accountId)) {
            return WatchedWordsListModel_1.regexCache.get(accountId);
        }
        const models = await WatchedWordsListModel_1.findAll({
            where: { accountId },
            transaction
        });
        const result = models.map(m => ({ listName: m.listName, regex: wordsToRegExp(m.words) }));
        this.regexCache.set(accountId, result);
        logger.debug('Will cache watched words regex', { accountId, result, tags: ['watched-words'] });
        return result;
    }
    static createList(options) {
        WatchedWordsListModel_1.regexCache.delete(options.accountId);
        return super.create(options);
    }
    updateList(options) {
        const { listName, words } = options;
        if (words && words.length === 0) {
            throw new Error('Cannot update watched words with an empty list');
        }
        if (words)
            this.words = words;
        if (listName)
            this.listName = listName;
        WatchedWordsListModel_1.regexCache.delete(this.accountId);
        return this.save();
    }
    destroy() {
        WatchedWordsListModel_1.regexCache.delete(this.accountId);
        return super.destroy();
    }
    toFormattedJSON() {
        return {
            id: this.id,
            listName: this.listName,
            words: this.words,
            updatedAt: this.updatedAt,
            createdAt: this.createdAt
        };
    }
};
WatchedWordsListModel.regexCache = new LRUCache({
    max: LRU_CACHE.WATCHED_WORDS_REGEX.MAX_SIZE,
    ttl: LRU_CACHE.WATCHED_WORDS_REGEX.TTL
});
__decorate([
    CreatedAt,
    __metadata("design:type", Date)
], WatchedWordsListModel.prototype, "createdAt", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], WatchedWordsListModel.prototype, "updatedAt", void 0);
__decorate([
    AllowNull(false),
    Column,
    __metadata("design:type", String)
], WatchedWordsListModel.prototype, "listName", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.ARRAY(DataType.STRING)),
    __metadata("design:type", Array)
], WatchedWordsListModel.prototype, "words", void 0);
__decorate([
    ForeignKey(() => AccountModel),
    Column,
    __metadata("design:type", Number)
], WatchedWordsListModel.prototype, "accountId", void 0);
__decorate([
    BelongsTo(() => AccountModel, {
        foreignKey: {
            allowNull: false
        },
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Object)
], WatchedWordsListModel.prototype, "Account", void 0);
WatchedWordsListModel = WatchedWordsListModel_1 = __decorate([
    Table({
        tableName: 'watchedWordsList',
        indexes: [
            {
                fields: ['listName', 'accountId'],
                unique: true
            },
            {
                fields: ['accountId']
            }
        ]
    })
], WatchedWordsListModel);
export { WatchedWordsListModel };
//# sourceMappingURL=watched-words-list.js.map