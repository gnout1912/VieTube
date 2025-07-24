import { AutomaticTagger } from '../../automatic-tags/automatic-tagger.js';
import { AbstractUserExporter } from './abstract-user-exporter.js';
export class AutoTagPoliciesExporter extends AbstractUserExporter {
    async export() {
        const data = await AutomaticTagger.getAutomaticTagPolicies(this.user.Account);
        return {
            json: {
                reviewComments: data.review.map(name => ({ name }))
            },
            staticFiles: []
        };
    }
}
//# sourceMappingURL=auto-tag-policies.js.map