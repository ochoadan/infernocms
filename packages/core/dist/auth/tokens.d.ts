import type { DbClient } from '../database/client.js';
export declare const TOKEN_PREFIX = "icms_";
export type TokenScope = 'read' | 'write' | 'admin';
export interface TokenRecord {
    id: string;
    name: string;
    scope: TokenScope;
    created_at: string;
    last_used_at: string | null;
}
export interface MintedToken {
    id: string;
    name: string;
    scope: TokenScope;
    plaintext: string;
}
export declare function generateToken(): string;
export declare function hashToken(plaintext: string): string;
export declare function mintToken(db: DbClient, opts: {
    name: string;
    scope: TokenScope;
    createdBy?: string | null;
    plaintext?: string;
}): Promise<MintedToken>;
export declare function lookupToken(db: DbClient, plaintext: string): Promise<{
    id: string;
    name: string;
    scope: TokenScope;
} | null>;
export declare function listTokens(db: DbClient): Promise<TokenRecord[]>;
export declare function revokeToken(db: DbClient, id: string): Promise<void>;
export declare function adminTokenCount(db: DbClient): Promise<number>;
//# sourceMappingURL=tokens.d.ts.map