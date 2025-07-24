import * as sequelize from 'sequelize';
import { SequelizeInstrumentationConfig } from './types';
import { InstrumentationBase, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation';
export declare class SequelizeInstrumentation extends InstrumentationBase {
    static readonly component = "sequelize";
    protected _config: SequelizeInstrumentationConfig;
    private moduleVersion;
    constructor(config?: SequelizeInstrumentationConfig);
    setConfig(config?: SequelizeInstrumentationConfig): void;
    protected init(): InstrumentationModuleDefinition;
    protected patchConnectionManager(moduleExports: any): any;
    protected unpatchConnectionManager(moduleExports: any): any;
    protected patch(moduleExports: typeof sequelize, moduleVersion: string): typeof sequelize;
    protected unpatch(moduleExports: typeof sequelize): void;
    private _getConnectionPatch;
    private _createQueryPatch;
    private _getNetTransport;
}
//# sourceMappingURL=sequelize.d.ts.map