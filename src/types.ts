export interface PasswordEntry {
    id?: number;
    name: string;
    url: string;
    category: string;
    username: string;
    password: string;
    notes: string;
    historyLimit?: number;
    lastUpdated?: string;
}

export interface PasswordHistoryItem {
    id: number;
    passwordId: number;
    password: string;
    changedAt: string;
}
