declare module 'sql.js' {
    export interface SqlJsStatic {
        Database: {
            new (data?: Uint8Array): Database;
        };
    }

    export interface Statement {
        step(): boolean;
        get(): any[];
        free(): void;
        run(params?: any[] | { [key: string]: any }): void;
    }

    export interface Database {
        run(sql: string | Uint8Array, params?: any[] | { [key: string]: any }): Database;
        prepare(sql: string): Statement;
        export(): Uint8Array;
    }

    export default function initSqlJs(config?: {
        locateFile?: (file: string) => string;
    }): Promise<SqlJsStatic>;
}
