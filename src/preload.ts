import { contextBridge, ipcRenderer } from 'electron';
import type { PasswordEntry, PasswordHistoryItem } from './types';

const api = {
    checkMasterPassword: async (): Promise<boolean> => {
        return await ipcRenderer.invoke('master:check');
    },
    createMasterPassword: async (password: string): Promise<boolean> => {
        return await ipcRenderer.invoke('master:create', password);
    },
    verifyMasterPassword: async (password: string): Promise<boolean> => {
        return await ipcRenderer.invoke('master:verify', password);
    },
    changeMasterPassword: async (
        currentPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        return await ipcRenderer.invoke('master:change', currentPassword, newPassword);
    },
    openExternal: async (url: string): Promise<void> => {
        return await ipcRenderer.invoke('shell:openExternal', url);
    },
    getTheme: async (): Promise<string | null> => {
        return await ipcRenderer.invoke('theme:get');
    },
    setTheme: async (theme: string): Promise<void> => {
        return await ipcRenderer.invoke('theme:set', theme);
    },
    getInactivityTimeout: async (): Promise<number> => {
        return await ipcRenderer.invoke('settings:getInactivityTimeout');
    },
    setInactivityTimeout: async (minutes: number): Promise<void> => {
        return await ipcRenderer.invoke('settings:setInactivityTimeout', minutes);
    },
    list: async (): Promise<PasswordEntry[]> => {
        return await ipcRenderer.invoke('passwords:list');
    },
    save: async (entry: PasswordEntry): Promise<PasswordEntry[]> => {
        return await ipcRenderer.invoke('passwords:save', entry);
    },
    getHistory: async (passwordId: number): Promise<PasswordHistoryItem[]> => {
        return await ipcRenderer.invoke('passwords:getHistory', passwordId);
    },
    clearHistory: async (passwordId: number): Promise<void> => {
        return await ipcRenderer.invoke('passwords:clearHistory', passwordId);
    },
    pruneHistory: async (passwordId: number, limit: number): Promise<void> => {
        return await ipcRenderer.invoke('passwords:pruneHistory', passwordId, limit);
    },
    delete: async (id: number): Promise<PasswordEntry[]> => {
        return await ipcRenderer.invoke('passwords:delete', id);
    },
    copy: async (id: number): Promise<PasswordEntry[]> => {
        return await ipcRenderer.invoke('passwords:copy', id);
    },
    exportCSV: async (): Promise<boolean> => {
        return await ipcRenderer.invoke('passwords:exportCSV');
    },
    importCSV: async (): Promise<{ success: boolean; count: number; error?: string }> => {
        return await ipcRenderer.invoke('passwords:importCSV');
    },
};

declare global {
    interface Window {
        passwordApi: typeof api;
    }
}

contextBridge.exposeInMainWorld('passwordApi', api);
