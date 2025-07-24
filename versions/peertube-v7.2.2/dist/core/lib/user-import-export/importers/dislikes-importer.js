import { AbstractRatesImporter } from './abstract-rates-importer.js';
export class DislikesImporter extends AbstractRatesImporter {
    getImportObjects(json) {
        return json.dislikes;
    }
    sanitize(o) {
        return this.sanitizeRate(o);
    }
    async importObject(dislikesImportData) {
        return this.importRate(dislikesImportData, 'dislike');
    }
}
//# sourceMappingURL=dislikes-importer.js.map