import type { NormalizedConfig } from '../config/types.js';
export interface ColumnInfo {
    name: string;
    dataType: string;
    isNullable: boolean;
    columnDefault: string | null;
    isUnique: boolean;
}
export interface TableInfo {
    columns: Map<string, ColumnInfo>;
}
export type MigrationOp = {
    type: 'CreateTable';
    table: string;
    destructive: false;
} | {
    type: 'AddColumn';
    table: string;
    column: string;
    definition: string;
    destructive: false;
} | {
    type: 'DropColumn';
    table: string;
    column: string;
    destructive: true;
} | {
    type: 'AlterColumn';
    table: string;
    column: string;
    sql: string;
    description: string;
    destructive: boolean;
} | {
    type: 'CreateIndex';
    table: string;
    sql: string;
    destructive: false;
} | {
    type: 'CreateJunctionTable';
    table: string;
    destructive: false;
} | {
    type: 'DropTable';
    table: string;
    destructive: true;
};
export declare function diffSchema(actual: Map<string, TableInfo>, config: NormalizedConfig, knownCmsTables?: Set<string>): MigrationOp[];
//# sourceMappingURL=schema-diff.d.ts.map