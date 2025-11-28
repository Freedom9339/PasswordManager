import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { PasswordEntry, PasswordHistoryItem } from './types';
import * as crypto from 'crypto';

let mainWindow: BrowserWindow | null = null;

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
let dbPath: string | null = null;
let encryptionKey: string | null = null;
let isAuthenticated = false;

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string, key: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function saveToDisk() {
    if (!db || !dbPath) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    import('fs')
        .then((fsMod) => {
            fsMod.writeFileSync(dbPath as string, buffer);
        })
        .catch((e) => {
            console.error(e);
        });
}

async function initDatabase() {
    if (!SQL) {
        SQL = await initSqlJs();
    }

    dbPath = path.join(app.getPath('userData'), 'pm.sqlite');
    let dbBuffer: Uint8Array | null = null;
    try {
        const fsMod = await import('fs');
        if (fsMod.existsSync(dbPath)) {
            const fileBuffer = fsMod.readFileSync(dbPath);
            dbBuffer = new Uint8Array(fileBuffer as Buffer);
        }
    } catch {
        // ignore read errors, will create new DB
    }

    db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database();

    db.run(`
    CREATE TABLE IF NOT EXISTS MASTER_PASSWORD (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT NOT NULL
    );
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS SETTINGS (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS PASSWORDS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT,
      category TEXT,
      username TEXT,
      password TEXT,
      notes TEXT,
      history_limit INTEGER,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS PASSWORD_HISTORY (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      password_id INTEGER NOT NULL,
      password TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      FOREIGN KEY(password_id) REFERENCES PASSWORDS(id) ON DELETE CASCADE
    );
  `);

    app.on('before-quit', () => {
        saveToDisk();
    });
}

function createWindow() {
    const appPath = app.getAppPath();
    const preloadPath = path.join(appPath, 'dist-preload', 'preload.js');
    const indexPath = path.join(appPath, 'index.html');
    const iconPath512 = path.join(appPath, 'icon512.png');
    const iconPath256 = path.join(appPath, 'icon.png');

    let icon = nativeImage.createFromPath(iconPath512);
    if (icon.isEmpty()) {
        icon = nativeImage.createFromPath(iconPath256);
    }

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: icon,
        autoHideMenuBar: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(indexPath);
    mainWindow.setMenuBarVisibility(false);

    // For Linux/Wayland
    if (process.platform === 'linux') {
        mainWindow.setIcon(icon);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    await initDatabase();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('settings:getInactivityTimeout', (): number => {
    if (!db) return 0;
    try {
        const stmt = db.prepare("SELECT value FROM SETTINGS WHERE key = 'inactivityTimeout'");
        if (stmt.step()) {
            const value = stmt.get()[0] as string;
            stmt.free();
            return parseInt(value, 10) || 0;
        }
        stmt.free();
        return 0;
    } catch {
        return 0;
    }
});

ipcMain.handle('settings:setInactivityTimeout', async (_event, minutes: number) => {
    if (!db) return;
    db.run("INSERT OR REPLACE INTO SETTINGS (key, value) VALUES ('inactivityTimeout', ?)", [
        String(minutes),
    ]);
    saveToDisk();
});

ipcMain.handle('master:check', (): boolean => {
    if (!db) return false;
    const stmt = db.prepare('SELECT password_hash FROM MASTER_PASSWORD WHERE id = 1');
    const hasRow = stmt.step();
    stmt.free();
    return hasRow;
});

ipcMain.handle('master:create', (event, password: string): boolean => {
    if (!db) return false;
    try {
        const hash = hashPassword(password);
        const stmt = db.prepare('INSERT INTO MASTER_PASSWORD (id, password_hash) VALUES (1, ?)');
        stmt.run([hash]);
        stmt.free();
        saveToDisk();
        encryptionKey = password;
        isAuthenticated = true;
        return true;
    } catch (err) {
        console.error('Failed to create master password:', err);
        return false;
    }
});

ipcMain.handle('master:verify', (event, password: string): boolean => {
    if (!db) return false;
    const hash = hashPassword(password);
    const stmt = db.prepare('SELECT password_hash FROM MASTER_PASSWORD WHERE id = 1');
    if (stmt.step()) {
        const [storedHash] = stmt.get();
        stmt.free();
        if (hash === storedHash) {
            encryptionKey = password;
            isAuthenticated = true;
            return true;
        }
    }
    stmt.free();
    return false;
});

ipcMain.handle(
    'master:change',
    async (
        event,
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!db || !isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }

        const currentHash = hashPassword(currentPassword);
        const stmt = db.prepare('SELECT password_hash FROM MASTER_PASSWORD WHERE id = 1');
        let storedHash = '';
        if (stmt.step()) {
            [storedHash] = stmt.get();
        }
        stmt.free();

        if (currentHash !== storedHash) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Get all passwords to re-encrypt them
        const passwords: Array<{ id: number; password: string }> = [];
        const selectStmt = db.prepare('SELECT id, password FROM PASSWORDS');
        while (selectStmt.step()) {
            const [id, encryptedPassword] = selectStmt.get();
            if (encryptedPassword && encryptionKey) {
                try {
                    const decrypted = decrypt(encryptedPassword as string, encryptionKey);
                    passwords.push({ id: id as number, password: decrypted });
                } catch (err) {
                    passwords.push({ id: id as number, password: encryptedPassword as string });
                }
            }
        }
        selectStmt.free();

        const history: Array<{ id: number; password: string }> = [];
        const historyStmt = db.prepare('SELECT id, password FROM PASSWORD_HISTORY');
        while (historyStmt.step()) {
            const [id, encryptedPassword] = historyStmt.get();
            if (encryptedPassword && encryptionKey) {
                try {
                    const decrypted = decrypt(encryptedPassword as string, encryptionKey);
                    history.push({ id: id as number, password: decrypted });
                } catch (err) {
                    history.push({ id: id as number, password: encryptedPassword as string });
                }
            }
        }
        historyStmt.free();

        const newHash = hashPassword(newPassword);
        db.run('BEGIN TRANSACTION');

        try {
            const updateMasterStmt = db.prepare(
                'UPDATE MASTER_PASSWORD SET password_hash = ? WHERE id = 1'
            );
            updateMasterStmt.run([newHash]);
            updateMasterStmt.free();

            for (const pwd of passwords) {
                const newEncrypted = encrypt(pwd.password, newPassword);
                const updatePwdStmt = db.prepare('UPDATE PASSWORDS SET password = ? WHERE id = ?');
                updatePwdStmt.run([newEncrypted, pwd.id]);
                updatePwdStmt.free();
            }

            for (const hist of history) {
                const newEncrypted = encrypt(hist.password, newPassword);
                const updateHistStmt = db.prepare(
                    'UPDATE PASSWORD_HISTORY SET password = ? WHERE id = ?'
                );
                updateHistStmt.run([newEncrypted, hist.id]);
                updateHistStmt.free();
            }

            db.run('COMMIT');
            saveToDisk();

            encryptionKey = newPassword;

            return { success: true };
        } catch (err) {
            db.run('ROLLBACK');
            console.error('Failed to change master password:', err);
            return { success: false, error: 'Failed to update password' };
        }
    }
);

ipcMain.handle('shell:openExternal', async (event, url: string): Promise<void> => {
    await shell.openExternal(url);
});

ipcMain.handle('theme:get', (): string | null => {
    if (!db) return null;
    try {
        const stmt = db.prepare('SELECT key, value FROM SETTINGS');
        while (stmt.step()) {
            const [key, value] = stmt.get();
            if (key === 'theme') {
                stmt.free();
                return value as string;
            }
        }
        stmt.free();
        return null;
    } catch {
        return null;
    }
});

ipcMain.handle('theme:set', (event, theme: string): void => {
    if (!db) return;
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO SETTINGS (key, value) VALUES (?, ?)');
        stmt.run(['theme', theme]);
        stmt.free();
        saveToDisk();
    } catch (err) {
        console.error('Failed to save theme:', err);
    }
});

ipcMain.handle('passwords:list', (): PasswordEntry[] => {
    if (!db || !isAuthenticated || !encryptionKey) return [];
    const rows: PasswordEntry[] = [];
    const stmt = db.prepare(
        `SELECT id, name, url, category, username, password, notes, history_limit, last_updated FROM PASSWORDS ORDER BY name`
    );
    while (stmt.step()) {
        const [id, name, url, category, username, password, notes, historyLimit, lastUpdated] =
            stmt.get();
        let decryptedPassword = password as string;
        if (password && encryptionKey) {
            try {
                decryptedPassword = decrypt(password as string, encryptionKey);
            } catch (err) {
                // If decryption fails, might be unencrypted old data
                decryptedPassword = password as string;
            }
        }
        rows.push({
            id,
            name,
            url,
            category,
            username,
            password: decryptedPassword,
            notes,
            historyLimit,
            lastUpdated: lastUpdated as string,
        });
    }
    stmt.free();
    return rows;
});

ipcMain.handle('passwords:save', (event, entry: PasswordEntry): PasswordEntry[] => {
    if (!db || !isAuthenticated || !encryptionKey) return [];

    db.run('BEGIN TRANSACTION');

    let oldPassword = '';
    if (entry.id) {
        const passStmt = db.prepare(`SELECT id, password FROM PASSWORDS`);
        while (passStmt.step()) {
            const [id, password] = passStmt.get();
            if (id === entry.id) {
                if (password && encryptionKey) {
                    try {
                        oldPassword = decrypt(password as string, encryptionKey);
                    } catch (err) {
                        oldPassword = password ? String(password) : '';
                    }
                } else {
                    oldPassword = password ? String(password) : '';
                }
                break;
            }
        }
        passStmt.free();
    }

    const encryptedPassword =
        entry.password && encryptionKey
            ? encrypt(entry.password, encryptionKey)
            : entry.password || '';

    const data = [
        entry.name || '',
        entry.url || '',
        entry.category || '',
        entry.username || '',
        encryptedPassword,
        entry.notes || '',
        typeof entry.historyLimit === 'number' ? entry.historyLimit : null,
    ];

    if (entry.id) {
        const newPassword = entry.password || '';

        // Record history when password changes and the old password was non-empty
        if (oldPassword !== newPassword && oldPassword !== '' && newPassword !== '') {
            const now = new Date().toISOString();
            const encryptedOldPassword = encryptionKey
                ? encrypt(oldPassword, encryptionKey)
                : oldPassword;
            const histStmt = db.prepare(
                `INSERT INTO PASSWORD_HISTORY (password_id, password, changed_at) VALUES (?, ?, ?)`
            );
            histStmt.run([entry.id, encryptedOldPassword, now]);
            histStmt.free();

            const limit = typeof entry.historyLimit === 'number' ? entry.historyLimit : 0;
            if (limit > 0) {
                const pruneStmt = db.prepare(`
          DELETE FROM PASSWORD_HISTORY 
          WHERE password_id = ? 
          AND id NOT IN (
            SELECT id FROM PASSWORD_HISTORY 
            WHERE password_id = ? 
            ORDER BY changed_at DESC 
            LIMIT ?
          )
        `);
                pruneStmt.run([entry.id, entry.id, limit]);
                pruneStmt.free();
            }
        }

        const updStmt = db.prepare(
            `UPDATE PASSWORDS SET name = ?, url = ?, category = ?, username = ?, password = ?, notes = ?, history_limit = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`
        );
        updStmt.run([...data, entry.id]);
        updStmt.free();
    } else {
        const insertStmt = db.prepare(
            `INSERT INTO PASSWORDS (name, url, category, username, password, notes, history_limit, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        );
        insertStmt.run(data);
        insertStmt.free();

        const idStmt = db.prepare('SELECT last_insert_rowid()');
        idStmt.step();
        const [newId] = idStmt.get();
        idStmt.free();
        entry.id = newId as number;
    }

    db.run('COMMIT');

    saveToDisk();

    const rows: PasswordEntry[] = [];
    const stmt = db.prepare(
        `SELECT id, name, url, category, username, password, notes, history_limit, last_updated FROM PASSWORDS ORDER BY name`
    );
    while (stmt.step()) {
        const [id, name, url, category, username, password, notes, historyLimit, lastUpdated] =
            stmt.get();
        let decryptedPassword = password as string;
        if (password && encryptionKey) {
            try {
                decryptedPassword = decrypt(password as string, encryptionKey);
            } catch (err) {
                decryptedPassword = password as string;
            }
        }
        rows.push({
            id,
            name,
            url,
            category,
            username,
            password: decryptedPassword,
            notes,
            historyLimit,
            lastUpdated: lastUpdated as string,
        });
    }
    stmt.free();
    return rows;
});

ipcMain.handle('passwords:getHistory', (event, passwordId: number): PasswordHistoryItem[] => {
    if (!db || !isAuthenticated || !encryptionKey) return [];
    const items: PasswordHistoryItem[] = [];

    const stmt = db.prepare(`SELECT id, password_id, password, changed_at FROM PASSWORD_HISTORY`);
    const allRecords: Array<[number, number, string, string]> = [];
    while (stmt.step()) {
        allRecords.push(stmt.get() as [number, number, string, string]);
    }
    stmt.free();

    for (const record of allRecords) {
        const [id, pwdId, password, changedAt] = record;
        if (pwdId === passwordId) {
            let decryptedPassword = password as string;
            if (password && encryptionKey) {
                try {
                    decryptedPassword = decrypt(password as string, encryptionKey);
                } catch (err) {
                    decryptedPassword = password as string;
                }
            }
            items.push({
                id: id as number,
                passwordId: pwdId as number,
                password: decryptedPassword,
                changedAt: changedAt as string,
            });
        }
    }

    items.sort((a, b) => b.changedAt.localeCompare(a.changedAt));

    return items;
});

ipcMain.handle('passwords:clearHistory', (event, passwordId: number): void => {
    if (!db) return;
    const stmt = db.prepare(`DELETE FROM password_history WHERE password_id = ?`);
    stmt.run([passwordId]);
    stmt.free();
});

ipcMain.handle('passwords:pruneHistory', (event, passwordId: number, limit: number): void => {
    if (!db) return;
    if (limit <= 0) {
        const delStmt = db.prepare(`DELETE FROM password_history WHERE password_id = ?`);
        delStmt.run([passwordId]);
        delStmt.free();
        return;
    }
    const stmt = db.prepare(
        `DELETE FROM PASSWORD_HISTORY WHERE id IN (
       SELECT id FROM PASSWORD_HISTORY
       WHERE password_id = ?
       ORDER BY changed_at DESC
       LIMIT -1 OFFSET ?
     )`
    );
    stmt.run([passwordId, limit]);
    stmt.free();
});

ipcMain.handle('passwords:delete', (event, id: number): PasswordEntry[] => {
    if (!db || !isAuthenticated || !encryptionKey) return [];

    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare(`DELETE FROM PASSWORDS WHERE id = ?`);
    stmt.run([id]);
    stmt.free();
    db.run('COMMIT');

    saveToDisk();

    const rows: PasswordEntry[] = [];
    const selectStmt = db.prepare(
        `SELECT id, name, url, category, username, password, notes, history_limit FROM PASSWORDS ORDER BY name`
    );
    while (selectStmt.step()) {
        const [id, name, url, category, username, password, notes, historyLimit] = selectStmt.get();
        let decryptedPassword = password as string;
        if (password && encryptionKey) {
            try {
                decryptedPassword = decrypt(password as string, encryptionKey);
            } catch (err) {
                decryptedPassword = password as string;
            }
        }
        rows.push({
            id,
            name,
            url,
            category,
            username,
            password: decryptedPassword,
            notes,
            historyLimit,
        });
    }
    selectStmt.free();
    return rows;
});

ipcMain.handle('passwords:copy', (event, id: number): PasswordEntry[] => {
    if (!db || !isAuthenticated || !encryptionKey) return [];

    const allStmt = db.prepare(
        `SELECT id, name, url, category, username, password, notes, history_limit FROM PASSWORDS`
    );
    let entryToCopy: any = null;
    while (allStmt.step()) {
        const row = allStmt.get();
        if (row[0] === id) {
            entryToCopy = row;
            break;
        }
    }
    allStmt.free();

    if (!entryToCopy) return [];

    const [, name, url, category, username, password, notes, historyLimit] = entryToCopy;

    // Create duplicate with "-duplicate" appended to name
    const newName = `${name}-duplicate`;
    db.run('BEGIN TRANSACTION');
    const insertStmt = db.prepare(
        `INSERT INTO PASSWORDS(name, url, category, username, password, notes, history_limit, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    );
    insertStmt.run([newName, url, category, username, password, notes, historyLimit]);
    insertStmt.free();
    db.run('COMMIT');
    saveToDisk();

    // Return updated list
    const rows: PasswordEntry[] = [];
    const listStmt = db.prepare(
        `SELECT id, name, url, category, username, password, notes, history_limit, last_updated FROM PASSWORDS ORDER BY name`
    );
    while (listStmt.step()) {
        const [
            rowId,
            rowName,
            rowUrl,
            rowCategory,
            rowUsername,
            rowPassword,
            rowNotes,
            rowHistoryLimit,
            lastUpdated,
        ] = listStmt.get();
        let decryptedPassword = rowPassword as string;
        if (rowPassword && encryptionKey) {
            try {
                decryptedPassword = decrypt(rowPassword as string, encryptionKey);
            } catch (err) {
                decryptedPassword = rowPassword as string;
            }
        }
        rows.push({
            id: rowId,
            name: rowName,
            url: rowUrl,
            category: rowCategory,
            username: rowUsername,
            password: decryptedPassword,
            notes: rowNotes,
            historyLimit: rowHistoryLimit,
            lastUpdated: lastUpdated as string,
        });
    }
    listStmt.free();
    return rows;
});

ipcMain.handle('passwords:exportCSV', async (): Promise<boolean> => {
    if (!db || !mainWindow || !isAuthenticated || !encryptionKey) return false;

    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Passwords to CSV',
            defaultPath: 'passwords.csv',
            filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        });

        if (!filePath) return false;

        const rows: PasswordEntry[] = [];
        const stmt = db.prepare(
            `SELECT id, name, url, category, username, password, notes, history_limit FROM PASSWORDS ORDER BY name`
        );
        while (stmt.step()) {
            const [id, name, url, category, username, password, notes, historyLimit] = stmt.get();
            let decryptedPassword = password as string;
            if (password && encryptionKey) {
                try {
                    decryptedPassword = decrypt(password as string, encryptionKey);
                } catch (err) {
                    decryptedPassword = password as string;
                }
            }
            rows.push({
                id,
                name,
                url,
                category,
                username,
                password: decryptedPassword,
                notes,
                historyLimit,
            });
        }
        stmt.free();

        // Build CSV
        const escapeCSV = (val: any): string => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const header = 'name,url,category,username,password,notes,history_limit\n';
        const lines = rows.map((r) =>
            [r.name, r.url, r.category, r.username, r.password, r.notes, r.historyLimit ?? '']
                .map(escapeCSV)
                .join(',')
        );
        const csv = header + lines.join('\n');

        const fsMod = await import('fs');
        fsMod.writeFileSync(filePath, csv, 'utf8');

        return true;
    } catch (err) {
        console.error('Export failed:', err);
        return false;
    }
});

ipcMain.handle(
    'passwords:importCSV',
    async (): Promise<{ success: boolean; count: number; error?: string }> => {
        if (!db || !mainWindow || !isAuthenticated || !encryptionKey)
            return { success: false, count: 0, error: 'Database not initialized' };

        try {
            const { filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Passwords from CSV',
                filters: [{ name: 'CSV Files', extensions: ['csv'] }],
                properties: ['openFile'],
            });

            if (!filePaths || filePaths.length === 0) return { success: false, count: 0 };

            const fsMod = await import('fs');
            const content = fsMod.readFileSync(filePaths[0], 'utf8');

            const lines = content.split('\n').filter((line) => line.trim());
            if (lines.length === 0) return { success: false, count: 0, error: 'Empty file' };

            const dataLines = lines.slice(1);

            const parseCSVLine = (line: string): string[] => {
                const result: string[] = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const nextChar = line[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            current += '"';
                            i++; // skip next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current);
                return result;
            };

            db.run('BEGIN TRANSACTION');

            let imported = 0;
            for (const line of dataLines) {
                const fields = parseCSVLine(line);
                if (fields.length < 6) continue;

                const [name, url, category, username, password, notes, historyLimit] = fields;
                const limit = historyLimit ? parseInt(historyLimit, 10) : null;

                const encryptedPassword =
                    password && encryptionKey ? encrypt(password, encryptionKey) : password || '';

                const stmt = db.prepare(
                    `INSERT INTO PASSWORDS (name, url, category, username, password, notes, history_limit) VALUES (?, ?, ?, ?, ?, ?, ?)`
                );
                stmt.run([
                    name || '',
                    url || '',
                    category || '',
                    username || '',
                    encryptedPassword,
                    notes || '',
                    isNaN(limit as number) ? null : limit,
                ]);
                stmt.free();
                imported++;
            }

            db.run('COMMIT');
            saveToDisk();

            return { success: true, count: imported };
        } catch (err) {
            console.error('Import failed:', err);
            return { success: false, count: 0, error: String(err) };
        }
    }
);
