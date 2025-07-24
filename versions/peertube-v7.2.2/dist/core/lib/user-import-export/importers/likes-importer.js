import { AbstractRatesImporter } from './abstract-rates-importer.js';
export class LikesImporter extends AbstractRatesImporter {
    getImportObjects(json) {
        return json.likes;
    }
    sanitize(o) {
        return this.sanitizeRate(o);
    }
    async importObject(likesImportData) {
        return this.importRate(likesImportData, 'like');
    }
}
//# sourceMappingURL=likes-importer.js.map