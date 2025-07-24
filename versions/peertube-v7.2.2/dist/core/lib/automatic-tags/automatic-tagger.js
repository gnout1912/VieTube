import { AutomaticTagPolicy } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { WEBSERVER } from '../../initializers/constants.js';
import { getServerActor } from '../../models/application/application.js';
import { AccountAutomaticTagPolicyModel } from '../../models/automatic-tag/account-automatic-tag-policy.js';
import { WatchedWordsListModel } from '../../models/watched-words/watched-words-list.js';
import Linkifyit from 'linkify-it';
const lTags = loggerTagsFactory('automatic-tags');
const linkifyit = new Linkifyit();
export class AutomaticTagger {
    async buildCommentsAutomaticTags(options) {
        const { text, ownerAccount, transaction } = options;
        const serverAccount = (await getServerActor()).Account;
        try {
            const [accountTags, serverTags] = await Promise.all([
                this.buildAutomaticTags({ account: ownerAccount, text, transaction }),
                this.buildAutomaticTags({ account: serverAccount, text, transaction })
            ]);
            logger.debug('Built automatic tags for comment', Object.assign({ text, accountTags, serverTags }, lTags()));
            return [...accountTags, ...serverTags];
        }
        catch (err) {
            logger.error('Cannot build comment automatic tags', Object.assign({ text, err }, lTags()));
            return [];
        }
    }
    async buildVideoAutomaticTags(options) {
        const { video, transaction } = options;
        const serverAccount = (await getServerActor()).Account;
        try {
            const [videoNameTags, videoDescriptionTags] = await Promise.all([
                this.buildAutomaticTags({ account: serverAccount, text: video.name, transaction }),
                this.buildAutomaticTags({ account: serverAccount, text: video.description, transaction })
            ]);
            logger.debug('Built automatic tags for video', Object.assign({ video, videoNameTags, videoDescriptionTags }, lTags()));
            return [...videoNameTags, ...videoDescriptionTags];
        }
        catch (err) {
            logger.error('Cannot build video automatic tags', Object.assign({ video, err }, lTags()));
            return [];
        }
    }
    async buildAutomaticTags(options) {
        const { text, account, transaction } = options;
        const tagsDone = new Set();
        const automaticTags = [];
        const watchedWords = await WatchedWordsListModel.buildWatchedWordsRegexp({ accountId: account.id, transaction });
        logger.debug(`Got watched words regex for account ${account.getDisplayName()}`, Object.assign({ watchedWords }, lTags()));
        for (const { listName, regex } of watchedWords) {
            try {
                if (regex.test(text)) {
                    tagsDone.add(listName);
                    automaticTags.push({ name: listName, accountId: account.id });
                }
            }
            catch (err) {
                logger.error('Cannot test regex against text', Object.assign({ regex, err }, lTags()));
            }
        }
        if (!tagsDone.has(AutomaticTagger.SPECIAL_TAGS.EXTERNAL_LINK) && this.hasExternalLinks(text)) {
            automaticTags.push({ name: AutomaticTagger.SPECIAL_TAGS.EXTERNAL_LINK, accountId: account.id });
            tagsDone.add(AutomaticTagger.SPECIAL_TAGS.EXTERNAL_LINK);
        }
        logger.debug('Built automatic tags for text', Object.assign({ text, automaticTags }, lTags()));
        return automaticTags;
    }
    hasExternalLinks(text) {
        if (!text)
            return false;
        const matches = linkifyit.match(text);
        if (!matches)
            return false;
        logger.debug('Found external links in text', Object.assign({ matches, text }, lTags()));
        return matches.some(({ url }) => new URL(url).host !== WEBSERVER.HOST);
    }
    static async getAutomaticTagPolicies(account) {
        const policies = await AccountAutomaticTagPolicyModel.listOfAccount(account);
        const result = {
            review: policies.filter(p => p.policy === AutomaticTagPolicy.REVIEW_COMMENT).map(p => p.name)
        };
        return result;
    }
    static async getAutomaticTagAvailable(account) {
        const result = {
            available: [
                ...(await WatchedWordsListModel.listNamesOf(account)).map(t => ({ name: t, type: 'watched-words-list' })),
                ...Object.values(AutomaticTagger.SPECIAL_TAGS).map(t => ({ name: t, type: 'core' }))
            ]
        };
        return result;
    }
}
AutomaticTagger.SPECIAL_TAGS = {
    EXTERNAL_LINK: 'external-link'
};
//# sourceMappingURL=automatic-tagger.js.map