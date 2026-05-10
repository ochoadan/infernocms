import type { DbClient } from '../database/client.js';
export interface BootstrapOptions {
    cwd?: string;
    log?: (line: string) => void;
}
export declare function runBootstrap(db: DbClient, opts?: BootstrapOptions): Promise<void>;
//# sourceMappingURL=bootstrap.d.ts.map