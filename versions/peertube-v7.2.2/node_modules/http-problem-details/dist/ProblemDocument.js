"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemDocumentExtension = exports.ProblemDocumentOptions = exports.ProblemDocument = void 0;
const StatusCodes_1 = require("./StatusCodes");
const url = __importStar(require("url"));
class ProblemDocument {
    constructor(options, extension) {
        const detail = options.detail;
        const instance = options.instance;
        let type = options.type;
        let title = options.title;
        const status = options.status;
        if (status && !type) {
            type = 'about:blank';
        }
        if (status && type === 'about:blank') {
            title = StatusCodes_1.statusCodes[status];
        }
        if (instance) {
            // eslint-disable-next-line node/no-deprecated-api
            url.parse(instance);
        }
        if (type) {
            // eslint-disable-next-line node/no-deprecated-api
            url.parse(type);
            // eslint-disable-next-line node/no-deprecated-api
        }
        // const result = {
        this.type = type;
        this.title = title;
        if (detail) {
            this.detail = detail;
        }
        this.instance = instance;
        this.status = status;
        // };
        if (extension) {
            const extensionProperties = extension instanceof ProblemDocumentExtension
                ? extension.extensionProperties
                : extension;
            for (const propertyName in extensionProperties) {
                if (extensionProperties.hasOwnProperty(propertyName)) {
                    this[propertyName] = extensionProperties[propertyName];
                }
            }
        }
    }
}
exports.ProblemDocument = ProblemDocument;
class ProblemDocumentOptions {
}
exports.ProblemDocumentOptions = ProblemDocumentOptions;
class ProblemDocumentExtension {
    constructor(extensionProperties) {
        this.extensionProperties = extensionProperties;
    }
}
exports.ProblemDocumentExtension = ProblemDocumentExtension;
//# sourceMappingURL=ProblemDocument.js.map