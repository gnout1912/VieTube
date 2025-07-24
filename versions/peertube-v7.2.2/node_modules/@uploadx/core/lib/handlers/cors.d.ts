import { IncomingMessage, ServerResponse } from '../types';
export interface CorsConfig {
    allowedHeaders?: string[];
    allowedMethods?: string[];
    allowOrigins?: (string | RegExp)[];
    credentials?: boolean;
    exposeHeaders?: string[];
    maxAge?: number;
}
export declare class Cors {
    allowedHeaders: string[];
    allowedMethods: string[];
    credentials: boolean;
    exposeHeaders: string[];
    maxAge: number;
    private _allowOrigins;
    constructor(config?: CorsConfig);
    set allowOrigins(value: (string | RegExp)[]);
    /**
     * Set cors headers
     * @returns `true` if it is a preflight request
     */
    preflight(req: IncomingMessage, res: ServerResponse, next?: (e?: any) => any): boolean;
    /**
     * Check if origin allowed
     */
    isOriginAllowed(origin: string): boolean;
}
type RequestHandler = (req: IncomingMessage, res: ServerResponse, next?: (e?: any) => any) => void;
/**
 * CORS middleware for Node.js.
 * @example
 * ```ts
 * app.use(cors({ allowOrigins: ['*'], exposeHeaders: ['Authorization, ETag'] }));
 * ```
 */
export declare const cors: (config?: CorsConfig) => RequestHandler;
export {};
