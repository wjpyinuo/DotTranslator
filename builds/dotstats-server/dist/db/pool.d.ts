import pg from 'pg';
export declare function initDatabase(): Promise<pg.Pool>;
export declare function getPool(): pg.Pool;
