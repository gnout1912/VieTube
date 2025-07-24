import { CONFIG } from '../initializers/config.js';
import { pathExists } from 'fs-extra/esm';
import { writeFile } from 'fs/promises';
import maxmind from 'maxmind';
import { join } from 'path';
import { isArray } from './custom-validators/misc.js';
import { logger, loggerTagsFactory } from './logger.js';
import { isBinaryResponse, unsafeSSRFGot } from './requests.js';
const lTags = loggerTagsFactory('geo-ip');
export class GeoIP {
    constructor() {
        this.INIT_READERS_RETRY_INTERVAL = 1000 * 60 * 10;
        this.countryDBPath = join(CONFIG.STORAGE.BIN_DIR, 'dbip-country-lite-latest.mmdb');
        this.cityDBPath = join(CONFIG.STORAGE.BIN_DIR, 'dbip-city-lite-latest.mmdb');
    }
    async safeIPISOLookup(ip) {
        var _a, _b;
        const emptyResult = { country: null, subdivisionName: null };
        if (CONFIG.GEO_IP.ENABLED === false)
            return emptyResult;
        try {
            if (!this.initReadersPromise)
                this.initReadersPromise = this.initReadersIfNeeded();
            await this.initReadersPromise;
            this.initReadersPromise = undefined;
            const countryResult = (_a = this.countryReader) === null || _a === void 0 ? void 0 : _a.get(ip);
            const cityResult = (_b = this.cityReader) === null || _b === void 0 ? void 0 : _b.get(ip);
            return {
                country: this.getISOCountry(countryResult),
                subdivisionName: this.getISOSubdivision(cityResult)
            };
        }
        catch (err) {
            logger.error('Cannot get country/city information from IP.', { err });
            return emptyResult;
        }
    }
    getISOCountry(countryResult) {
        var _a;
        return ((_a = countryResult === null || countryResult === void 0 ? void 0 : countryResult.country) === null || _a === void 0 ? void 0 : _a.iso_code) || null;
    }
    getISOSubdivision(subdivisionResult) {
        var _a;
        const subdivisions = subdivisionResult === null || subdivisionResult === void 0 ? void 0 : subdivisionResult.subdivisions;
        if (!isArray(subdivisions) || subdivisions.length === 0)
            return null;
        const subdivision = subdivisions[subdivisions.length - 1];
        return ((_a = subdivision.names) === null || _a === void 0 ? void 0 : _a.en) || null;
    }
    async updateDatabases() {
        if (CONFIG.GEO_IP.ENABLED === false)
            return;
        await this.updateCountryDatabase();
        await this.updateCityDatabase();
    }
    async updateCountryDatabase() {
        if (!CONFIG.GEO_IP.COUNTRY.DATABASE_URL)
            return false;
        await this.updateDatabaseFile(CONFIG.GEO_IP.COUNTRY.DATABASE_URL, this.countryDBPath);
        this.countryReader = undefined;
        return true;
    }
    async updateCityDatabase() {
        if (!CONFIG.GEO_IP.CITY.DATABASE_URL)
            return false;
        await this.updateDatabaseFile(CONFIG.GEO_IP.CITY.DATABASE_URL, this.cityDBPath);
        this.cityReader = undefined;
        return true;
    }
    async updateDatabaseFile(url, destination) {
        logger.info('Updating GeoIP databases from %s.', url, lTags());
        const gotOptions = { context: { bodyKBLimit: 800000 }, responseType: 'buffer' };
        try {
            const gotResult = await unsafeSSRFGot(url, gotOptions);
            if (!isBinaryResponse(gotResult)) {
                throw new Error('Not a binary response');
            }
            await writeFile(destination, gotResult.body);
            logger.info('GeoIP database updated %s.', destination, lTags());
        }
        catch (err) {
            logger.error('Cannot update GeoIP database from %s.', url, Object.assign({ err }, lTags()));
        }
    }
    async initReadersIfNeeded() {
        if (this.lastInitTry && this.lastInitTry.getTime() > Date.now() - this.INIT_READERS_RETRY_INTERVAL)
            return;
        this.lastInitTry = new Date();
        if (!this.countryReader) {
            let open = true;
            if (!await pathExists(this.countryDBPath)) {
                open = await this.updateCountryDatabase();
            }
            if (open) {
                this.countryReader = await maxmind.open(this.countryDBPath);
            }
        }
        if (!this.cityReader) {
            let open = true;
            if (!await pathExists(this.cityDBPath)) {
                open = await this.updateCityDatabase();
            }
            if (open) {
                this.cityReader = await maxmind.open(this.cityDBPath);
            }
        }
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
//# sourceMappingURL=geo-ip.js.map