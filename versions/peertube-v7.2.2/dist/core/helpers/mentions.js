import { uniqify } from '@peertube/peertube-core-utils';
import { WEBSERVER } from '../initializers/constants.js';
import { actorNameAlphabet } from './custom-validators/activitypub/actor.js';
import { regexpCapture } from './regexp.js';
export function extractMentions(text, isOwned) {
    let result = [];
    const localMention = `@(${actorNameAlphabet}+)`;
    const remoteMention = `${localMention}@${WEBSERVER.HOST}`;
    const mentionRegex = isOwned
        ? '(?:(?:' + remoteMention + ')|(?:' + localMention + '))'
        : '(?:' + remoteMention + ')';
    const firstMentionRegex = new RegExp(`^${mentionRegex} `, 'g');
    const endMentionRegex = new RegExp(` ${mentionRegex}$`, 'g');
    const remoteMentionsRegex = new RegExp(' ' + remoteMention + ' ', 'g');
    result = result.concat(regexpCapture(text, firstMentionRegex)
        .map(([, username1, username2]) => username1 || username2), regexpCapture(text, endMentionRegex)
        .map(([, username1, username2]) => username1 || username2), regexpCapture(text, remoteMentionsRegex)
        .map(([, username]) => username));
    if (isOwned) {
        const localMentionsRegex = new RegExp(' ' + localMention + ' ', 'g');
        result = result.concat(regexpCapture(text, localMentionsRegex)
            .map(([, username]) => username));
    }
    return uniqify(result);
}
//# sourceMappingURL=mentions.js.map