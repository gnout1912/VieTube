import { pick } from '@peertube/peertube-core-utils';
import { areWatchedWordsValid, isWatchedWordListNameValid } from '../../../helpers/custom-validators/watched-words.js';
import { WatchedWordsListModel } from '../../../models/watched-words/watched-words-list.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
export class WatchedWordsListsImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return json.watchedWordLists;
    }
    sanitize(data) {
        if (!isWatchedWordListNameValid(data.listName))
            return undefined;
        if (!areWatchedWordsValid(data.words))
            return undefined;
        return pick(data, ['listName', 'words']);
    }
    async importObject(data) {
        const accountId = this.user.Account.id;
        const existing = await WatchedWordsListModel.loadByListName({ listName: data.listName, accountId });
        if (existing) {
            await existing.updateList({ listName: data.listName, words: data.words });
        }
        else {
            await WatchedWordsListModel.createList({ accountId, listName: data.listName, words: data.words });
        }
        return { duplicate: false };
    }
}
//# sourceMappingURL=watched-words-lists-importer.js.map