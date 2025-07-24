import { AutomaticTagPolicy } from '@peertube/peertube-models';
import { isWatchedWordListNameValid } from '../../../helpers/custom-validators/watched-words.js';
import { setAccountAutomaticTagsPolicy } from '../../automatic-tags/automatic-tags.js';
import { AbstractUserImporter } from './abstract-user-importer.js';
export class ReviewCommentsTagPoliciesImporter extends AbstractUserImporter {
    getImportObjects(json) {
        if (!json.reviewComments)
            return [];
        return [json.reviewComments];
    }
    sanitize(data) {
        return data.filter(d => isWatchedWordListNameValid(d.name));
    }
    async importObject(data) {
        await setAccountAutomaticTagsPolicy({
            account: this.user.Account,
            policy: AutomaticTagPolicy.REVIEW_COMMENT,
            tags: data.map(v => v.name)
        });
        return { duplicate: false };
    }
}
//# sourceMappingURL=review-comments-tag-policies-importer.js.map