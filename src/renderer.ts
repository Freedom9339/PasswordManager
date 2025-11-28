import type { PasswordEntry, PasswordHistoryItem } from './types';

let entries: PasswordEntry[] = [];
let filteredEntries: PasswordEntry[] = [];
let selectedIndex = -1;
let dirty = false;
let isUnlocked = false;
let sortField: 'name' | 'lastUpdated' = 'name';
let sortAscending = true;

// Dialogs
const customDialogModal = document.getElementById('custom-dialog-modal') as HTMLDivElement;
const dialogTitle = document.getElementById('dialog-title') as HTMLHeadingElement;
const dialogMessage = document.getElementById('dialog-message') as HTMLParagraphElement;
const dialogOkBtn = document.getElementById('dialog-ok-btn') as HTMLButtonElement;
const dialogCancelBtn = document.getElementById('dialog-cancel-btn') as HTMLButtonElement;

function showAlert(message: string, title: string = 'Password Manager'): Promise<void> {
    return new Promise((resolve) => {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogCancelBtn.style.display = 'none';
        dialogOkBtn.textContent = 'OK';

        customDialogModal.classList.remove('hidden');
        customDialogModal.setAttribute('aria-hidden', 'false');

        const handleOk = () => {
            customDialogModal.classList.add('hidden');
            customDialogModal.setAttribute('aria-hidden', 'true');
            dialogOkBtn.removeEventListener('click', handleOk);
            resolve();
        };

        dialogOkBtn.addEventListener('click', handleOk);
    });
}

function showConfirm(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogCancelBtn.style.display = 'inline-block';
        dialogOkBtn.textContent = 'OK';

        customDialogModal.classList.remove('hidden');
        customDialogModal.setAttribute('aria-hidden', 'false');

        const handleOk = () => {
            customDialogModal.classList.add('hidden');
            customDialogModal.setAttribute('aria-hidden', 'true');
            dialogOkBtn.removeEventListener('click', handleOk);
            dialogCancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            customDialogModal.classList.add('hidden');
            customDialogModal.setAttribute('aria-hidden', 'true');
            dialogOkBtn.removeEventListener('click', handleOk);
            dialogCancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        dialogOkBtn.addEventListener('click', handleOk);
        dialogCancelBtn.addEventListener('click', handleCancel);
    });
}

const gridBody = document.getElementById('password-grid-body') as HTMLTableSectionElement;
const sortPasswordsBtn = document.getElementById('sort-passwords-btn') as HTMLButtonElement;
const sortUpdatedBtn = document.getElementById('sort-updated-btn') as HTMLButtonElement;
const addEntryBtn = document.getElementById('add-entry-btn') as HTMLButtonElement;
const deleteEntryBtn = document.getElementById('delete-entry-btn') as HTMLButtonElement;
const copyEntryBtn = document.getElementById('copy-entry-btn') as HTMLButtonElement;
const exportCsvBtn = document.getElementById('export-csv-btn') as HTMLButtonElement;
const importCsvBtn = document.getElementById('import-csv-btn') as HTMLButtonElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const discardBtn = document.getElementById('discard-btn') as HTMLButtonElement;
const togglePasswordBtn = document.getElementById('toggle-password') as HTMLButtonElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const lockBtn = document.getElementById('lock-btn') as HTMLButtonElement;
const copyNameBtn = document.getElementById('copy-name-btn') as HTMLButtonElement;
const copyCategoryBtn = document.getElementById('copy-category-btn') as HTMLButtonElement;
const copyUsernameBtn = document.getElementById('copy-username-btn') as HTMLButtonElement;
const copyPasswordBtn = document.getElementById('copy-password-btn') as HTMLButtonElement;
const launchUrlBtn = document.getElementById('launch-url-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement;

const historyBtn = document.getElementById('history-btn') as HTMLButtonElement;
const historyModal = document.getElementById('history-modal') as HTMLDivElement;
const historyCloseBtn = document.getElementById('history-close-btn') as HTMLButtonElement;
const historyDoneBtn = document.getElementById('history-done') as HTMLButtonElement;
const historyClearBtn = document.getElementById('history-clear') as HTMLButtonElement;
const historyApplyLimitBtn = document.getElementById('history-apply-limit') as HTMLButtonElement;
const historyLimitInput = document.getElementById('history-limit') as HTMLInputElement;
const historyGridBody = document.getElementById('history-grid-body') as HTMLTableSectionElement;

const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const settingsCloseBtn = document.getElementById('settings-close-btn') as HTMLButtonElement;
const settingsSaveBtn = document.getElementById('settings-save-btn') as HTMLButtonElement;
const timeoutSelect = document.getElementById('timeout-select') as HTMLSelectElement;
const themeLabel = document.getElementById('theme-label') as HTMLSpanElement;

const changeMasterPasswordBtn = document.getElementById(
    'change-master-password-btn'
) as HTMLButtonElement;
const changeMasterPasswordModal = document.getElementById(
    'change-master-password-modal'
) as HTMLDivElement;
const changeMasterPasswordCloseBtn = document.getElementById(
    'change-master-password-close-btn'
) as HTMLButtonElement;
const changeMasterPasswordCancelBtn = document.getElementById(
    'change-master-password-cancel-btn'
) as HTMLButtonElement;
const changeMasterPasswordSaveBtn = document.getElementById(
    'change-master-password-save-btn'
) as HTMLButtonElement;
const currentMasterPasswordInput = document.getElementById(
    'current-master-password'
) as HTMLInputElement;
const newMasterPasswordInput = document.getElementById('new-master-password') as HTMLInputElement;
const confirmNewMasterPasswordInput = document.getElementById(
    'confirm-new-master-password'
) as HTMLInputElement;
const changeMasterPasswordError = document.getElementById(
    'change-master-password-error'
) as HTMLParagraphElement;

const generatePasswordBtn = document.getElementById('generate-password-btn') as HTMLButtonElement;
const toolbarGenerateBtn = document.getElementById('toolbar-generate-btn') as HTMLButtonElement;
const generatePasswordModal = document.getElementById('generate-password-modal') as HTMLDivElement;
const generateCloseBtn = document.getElementById('generate-close-btn') as HTMLButtonElement;
const generateCancelBtn = document.getElementById('generate-cancel-btn') as HTMLButtonElement;
const generateUseBtn = document.getElementById('generate-use-btn') as HTMLButtonElement;
const generateCopyFooterBtn = document.getElementById(
    'generate-copy-footer-btn'
) as HTMLButtonElement;
const genRefreshBtn = document.getElementById('gen-refresh-btn') as HTMLButtonElement;
const genCopyBtn = document.getElementById('gen-copy-btn') as HTMLButtonElement;
const genLengthInput = document.getElementById('gen-length') as HTMLInputElement;
const genLengthValue = document.getElementById('gen-length-value') as HTMLSpanElement;
const genUppercaseInput = document.getElementById('gen-uppercase') as HTMLInputElement;
const genLowercaseInput = document.getElementById('gen-lowercase') as HTMLInputElement;
const genNumbersInput = document.getElementById('gen-numbers') as HTMLInputElement;
const genSymbolsInput = document.getElementById('gen-symbols') as HTMLInputElement;
const genPreviewInput = document.getElementById('gen-preview') as HTMLInputElement;

const fields: (keyof PasswordEntry)[] = [
    'name',
    'url',
    'category',
    'username',
    'password',
    'notes',
];

let inactivityTimeoutMinutes = 0;
let inactivityTimer: NodeJS.Timeout | null = null;

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    if (!isUnlocked || inactivityTimeoutMinutes <= 0) {
        return;
    }

    inactivityTimer = setTimeout(
        () => {
            if (isUnlocked) {
                lockApp();
            }
        },
        inactivityTimeoutMinutes * 60 * 1000
    );
}

function setupInactivityListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
}

async function loadEntries() {
    if (!window.passwordApi || !isUnlocked) return;
    entries = await window.passwordApi.list();
    console.log(
        'Loaded entries:',
        entries.map((e) => ({ name: e.name, lastUpdated: e.lastUpdated }))
    );
    filteredEntries = entries.slice();
    sortEntries();
    renderGrid();
    if (filteredEntries.length > 0) {
        selectRow(0);
    } else {
        clearForm();
    }
}

function sortEntries() {
    filteredEntries.sort((a, b) => {
        if (sortField === 'name') {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return sortAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        } else {
            const dateA = new Date(a.lastUpdated || 0).getTime();
            const dateB = new Date(b.lastUpdated || 0).getTime();
            return sortAscending ? dateA - dateB : dateB - dateA;
        }
    });
}

function updateSortIcons() {
    const nameIcon = sortPasswordsBtn.querySelector('i');
    const updatedIcon = sortUpdatedBtn.querySelector('i');

    if (sortField === 'name') {
        if (nameIcon)
            nameIcon.className = sortAscending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
        if (updatedIcon) updatedIcon.className = 'fa-solid fa-sort';
    } else {
        if (nameIcon) nameIcon.className = 'fa-solid fa-sort';
        if (updatedIcon)
            updatedIcon.className = sortAscending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
    }
}

function renderGrid() {
    gridBody.innerHTML = '';
    filteredEntries.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.dataset.index = index.toString();
        if (index === selectedIndex) {
            tr.classList.add('selected');
        }
        const nameTd = document.createElement('td');
        const nameLine = document.createElement('div');
        nameLine.className = 'grid-name-line';
        nameLine.textContent = entry.name || '';

        const metaLine = document.createElement('div');
        metaLine.className = 'grid-meta-line';
        const category = entry.category || '';
        const url = entry.url || '';
        metaLine.textContent = [category, url].filter(Boolean).join(' · ');

        nameTd.appendChild(nameLine);
        nameTd.appendChild(metaLine);
        tr.appendChild(nameTd);

        const updatedTd = document.createElement('td');
        updatedTd.className = 'col-updated';
        if (entry.lastUpdated) {
            const date = new Date(entry.lastUpdated);
            updatedTd.textContent = isNaN(date.getTime()) ? '' : date.toLocaleDateString();
        }
        tr.appendChild(updatedTd);
        tr.addEventListener('click', async () => {
            if (dirty && !(await showConfirm('Discard unsaved changes?'))) {
                return;
            }
            selectRow(index);
        });
        gridBody.appendChild(tr);
    });
}

function selectRow(index: number) {
    selectedIndex = index;
    Array.from(gridBody.querySelectorAll('tr')).forEach((tr) => {
        tr.classList.toggle('selected', Number(tr.dataset.index) === index);
    });
    const entry = filteredEntries[index];
    if (!entry) {
        clearForm();
        return;
    }
    fields.forEach((field) => {
        const el = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement;
        el.value = (entry[field] as string) || '';
    });
    dirty = false;
}

function clearForm() {
    fields.forEach((field) => {
        const el = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement;
        el.value = '';
    });
    selectedIndex = -1;
    dirty = false;
}

function markDirty() {
    dirty = true;
}

fields.forEach((field) => {
    const el = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement;
    el.addEventListener('input', markDirty);
});

sortPasswordsBtn.addEventListener('click', () => {
    if (sortField === 'name') {
        sortAscending = !sortAscending;
    } else {
        sortField = 'name';
        sortAscending = true;
    }
    updateSortIcons();
    sortEntries();
    renderGrid();
    if (filteredEntries.length > 0 && selectedIndex >= 0) {
        const currentEntry = entries.find((e) => e.id === filteredEntries[selectedIndex]?.id);
        if (currentEntry) {
            const newIndex = filteredEntries.findIndex((e) => e.id === currentEntry.id);
            if (newIndex >= 0) {
                selectRow(newIndex);
            }
        }
    }
});

sortUpdatedBtn.addEventListener('click', () => {
    if (sortField === 'lastUpdated') {
        sortAscending = !sortAscending;
    } else {
        sortField = 'lastUpdated';
        sortAscending = false; // Default to newest first
    }
    updateSortIcons();
    sortEntries();
    renderGrid();
    if (filteredEntries.length > 0 && selectedIndex >= 0) {
        const currentEntry = entries.find((e) => e.id === filteredEntries[selectedIndex]?.id);
        if (currentEntry) {
            const newIndex = filteredEntries.findIndex((e) => e.id === currentEntry.id);
            if (newIndex >= 0) {
                selectRow(newIndex);
            }
        }
    }
});

addEntryBtn.addEventListener('click', () => {
    if (dirty && !confirm('Discard unsaved changes?')) {
        return;
    }
    const newEntry: PasswordEntry = {
        name: 'New Entry',
        url: '',
        category: '',
        username: '',
        password: '',
        notes: '',
    };
    entries.push(newEntry);
    filteredEntries = applyFilter(entries, searchInput.value);
    renderGrid();
    const newIndex = filteredEntries.indexOf(newEntry);
    if (newIndex >= 0) {
        selectRow(newIndex);
    }
    dirty = true;
});

saveBtn.addEventListener('click', async () => {
    const current: PasswordEntry = {
        id: selectedIndex >= 0 ? filteredEntries[selectedIndex]?.id : undefined,
        name: (document.getElementById('name') as HTMLInputElement).value,
        url: (document.getElementById('url') as HTMLInputElement).value,
        category: (document.getElementById('category') as HTMLInputElement).value,
        username: (document.getElementById('username') as HTMLInputElement).value,
        password: passwordInput.value,
        notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
    };

    const saved = await window.passwordApi.save(current);
    entries = saved;
    filteredEntries = applyFilter(entries, searchInput.value);

    // Find and select the saved entry by matching name, username, and url
    // This works for both new entries (where id was undefined) and updated entries
    const savedIndex = filteredEntries.findIndex(
        (e) => e.name === current.name && e.username === current.username && e.url === current.url
    );

    renderGrid();

    if (savedIndex >= 0) {
        selectedIndex = savedIndex;
        selectRow(selectedIndex);
    }
    dirty = false;
});

discardBtn.addEventListener('click', () => {
    if (selectedIndex >= 0) {
        selectRow(selectedIndex);
    } else {
        clearForm();
    }
    dirty = false;
});

let passwordVisible = false;

togglePasswordBtn.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    const icon = togglePasswordBtn.querySelector('i');
    if (icon) {
        if (passwordVisible) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
});

function applyFilter(list: PasswordEntry[], query: string): PasswordEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice();
    return list.filter((entry) => {
        return (
            (entry.name || '').toLowerCase().includes(q) ||
            (entry.category || '').toLowerCase().includes(q) ||
            (entry.url || '').toLowerCase().includes(q) ||
            (entry.username || '').toLowerCase().includes(q)
        );
    });
}

searchInput.addEventListener('input', () => {
    filteredEntries = applyFilter(entries, searchInput.value);
    sortEntries();
    renderGrid();
    if (filteredEntries.length > 0) {
        selectRow(0);
    } else {
        clearForm();
    }
});

deleteEntryBtn.addEventListener('click', async () => {
    if (selectedIndex < 0) return;
    const entry = filteredEntries[selectedIndex];
    if (!entry || !entry.id) return;
    if (!(await showConfirm('Delete this entry?', 'Delete Entry'))) return;

    const saved = await window.passwordApi.delete(entry.id);
    entries = saved;
    filteredEntries = applyFilter(entries, searchInput.value);
    renderGrid();
    if (filteredEntries.length > 0) {
        selectRow(Math.min(selectedIndex, filteredEntries.length - 1));
    } else {
        clearForm();
    }
});

copyEntryBtn.addEventListener('click', async () => {
    if (selectedIndex < 0) return;
    const entry = filteredEntries[selectedIndex];
    if (!entry || !entry.id) return;

    const saved = await window.passwordApi.copy(entry.id);
    entries = saved;
    filteredEntries = applyFilter(entries, searchInput.value);
    sortEntries();
    renderGrid();

    // Find and select the newly duplicated entry (name-duplicate)
    const copiedName = `${entry.name}-duplicate`;
    const copiedIndex = filteredEntries.findIndex(
        (e) => e.name === copiedName && e.url === entry.url && e.username === entry.username
    );
    if (copiedIndex >= 0) {
        selectRow(copiedIndex);
    }
});

function getSelectedEntry(): PasswordEntry | null {
    if (selectedIndex < 0) return null;
    const entry = filteredEntries[selectedIndex];
    return entry || null;
}

function openHistoryModal() {
    const entry = getSelectedEntry();
    console.log('[openHistoryModal] Selected entry:', entry);
    if (!entry || !entry.id) {
        alert('Select a saved entry first.');
        return;
    }
    const limit =
        typeof entry.historyLimit === 'number' && entry.historyLimit >= 0 ? entry.historyLimit : 0;
    historyLimitInput.value = String(limit);
    console.log('[openHistoryModal] Opening modal for entry ID:', entry.id);
    loadHistory(entry.id);
    historyModal.classList.remove('hidden');
    historyModal.setAttribute('aria-hidden', 'false');
}

function closeHistoryModal() {
    historyModal.classList.add('hidden');
    historyModal.setAttribute('aria-hidden', 'true');
}

async function loadHistory(passwordId: number) {
    const items: PasswordHistoryItem[] = await window.passwordApi.getHistory(passwordId);
    historyGridBody.innerHTML = '';

    if (items.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.textContent =
            'No password history yet. Change this password to start recording history.';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
        td.style.color = '#9ca3af';
        tr.appendChild(td);
        historyGridBody.appendChild(tr);
        return;
    }

    items.forEach((item) => {
        const tr = document.createElement('tr');

        const dateTd = document.createElement('td');
        const date = new Date(item.changedAt);
        dateTd.textContent = isNaN(date.getTime()) ? item.changedAt : date.toLocaleString();

        const passwordTd = document.createElement('td');
        passwordTd.className = 'history-password';
        const span = document.createElement('span');
        span.textContent = '••••••••';
        span.dataset.visible = 'false';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'icon-button';
        toggleBtn.title = 'Show password';
        toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        toggleBtn.addEventListener('click', () => {
            const visible = span.dataset.visible === 'true';
            span.textContent = visible ? '••••••••' : item.password;
            span.dataset.visible = visible ? 'false' : 'true';
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                if (visible) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    toggleBtn.title = 'Show password';
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    toggleBtn.title = 'Hide password';
                }
            }
        });

        passwordTd.appendChild(span);

        const actionsTd = document.createElement('td');
        const actionsContainer = document.createElement('div');
        actionsContainer.style.display = 'flex';
        actionsContainer.style.gap = '4px';
        actionsContainer.style.justifyContent = 'flex-start';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'icon-button';
        copyBtn.title = 'Copy password';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(item.password);
                const icon = copyBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-copy');
                    icon.classList.add('fa-check');
                    setTimeout(() => {
                        icon.classList.remove('fa-check');
                        icon.classList.add('fa-copy');
                    }, 1000);
                }
            } catch {
                await showAlert('Could not copy to clipboard.');
            }
        });

        actionsContainer.appendChild(toggleBtn);
        actionsContainer.appendChild(copyBtn);
        actionsTd.appendChild(actionsContainer);

        tr.appendChild(dateTd);
        tr.appendChild(passwordTd);
        tr.appendChild(actionsTd);
        historyGridBody.appendChild(tr);
    });
}

historyBtn.addEventListener('click', () => {
    openHistoryModal();
});

historyCloseBtn.addEventListener('click', () => {
    closeHistoryModal();
});

historyDoneBtn.addEventListener('click', () => {
    closeHistoryModal();
});

function generatePassword(): string {
    const length = parseInt(genLengthInput.value, 10) || 16;
    const useUppercase = genUppercaseInput.checked;
    const useLowercase = genLowercaseInput.checked;
    const useNumbers = genNumbersInput.checked;
    const useSymbols = genSymbolsInput.checked;

    let charset = '';
    if (useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) charset += '0123456789';
    if (useSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (charset.length === 0) {
        return '';
    }

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset[array[i] % charset.length];
    }
    return password;
}

function openGeneratePasswordModal(showUseButton: boolean = true) {
    updateSliderFill();
    genPreviewInput.value = generatePassword();
    generateUseBtn.style.display = showUseButton ? 'inline-block' : 'none';
    generateCopyFooterBtn.style.display = showUseButton ? 'none' : 'inline-block';
    generatePasswordModal.classList.remove('hidden');
    generatePasswordModal.setAttribute('aria-hidden', 'false');
}

function closeGeneratePasswordModal() {
    generatePasswordModal.classList.add('hidden');
    generatePasswordModal.setAttribute('aria-hidden', 'true');
}

generatePasswordBtn.addEventListener('click', () => {
    openGeneratePasswordModal(true);
});

toolbarGenerateBtn.addEventListener('click', () => {
    openGeneratePasswordModal(false);
});

generateCloseBtn.addEventListener('click', () => {
    closeGeneratePasswordModal();
});

generateCancelBtn.addEventListener('click', () => {
    closeGeneratePasswordModal();
});

generateUseBtn.addEventListener('click', () => {
    const generatedPassword = genPreviewInput.value;
    if (generatedPassword) {
        passwordInput.value = generatedPassword;
        markDirty();
    }
    closeGeneratePasswordModal();
});

genRefreshBtn.addEventListener('click', () => {
    genPreviewInput.value = generatePassword();
});

genCopyBtn.addEventListener('click', async () => {
    const password = genPreviewInput.value;
    if (!password) return;
    try {
        await navigator.clipboard.writeText(password);
        const icon = genCopyBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
    } catch (err) {
        await showAlert('Failed to copy to clipboard');
    }
});

generateCopyFooterBtn.addEventListener('click', async () => {
    const password = genPreviewInput.value;
    if (!password) return;
    try {
        await navigator.clipboard.writeText(password);
        const icon = generateCopyFooterBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
        closeGeneratePasswordModal();
    } catch (err) {
        await showAlert('Failed to copy to clipboard');
    }
});

function updateSliderFill() {
    const min = parseInt(genLengthInput.min, 10);
    const max = parseInt(genLengthInput.max, 10);
    const value = parseInt(genLengthInput.value, 10);

    const percentage = ((value - min) / (max - min)) * 100;

    const styles = getComputedStyle(document.documentElement);
    const accentColor = styles.getPropertyValue('--accent-blue').trim();
    const borderColor = styles.getPropertyValue('--border-subtle').trim();

    genLengthInput.style.background = `linear-gradient(to right, ${accentColor} ${percentage}%, ${borderColor} ${percentage}%)`;
}

genLengthInput.addEventListener('input', () => {
    genLengthValue.textContent = genLengthInput.value;
    updateSliderFill();
    genPreviewInput.value = generatePassword();
});

updateSliderFill();

[genUppercaseInput, genLowercaseInput, genNumbersInput, genSymbolsInput].forEach((input) => {
    input.addEventListener('change', () => {
        genPreviewInput.value = generatePassword();
    });
});

historyClearBtn.addEventListener('click', async () => {
    const entry = getSelectedEntry();
    if (!entry || !entry.id) return;
    if (!(await showConfirm('Clear password history for this entry?', 'Clear History'))) return;
    await window.passwordApi.clearHistory(entry.id);
    await loadHistory(entry.id);
});

historyApplyLimitBtn.addEventListener('click', async () => {
    const entry = getSelectedEntry();
    if (!entry || !entry.id) return;
    const value = parseInt(historyLimitInput.value, 10);
    const limit = isNaN(value) ? 0 : Math.max(0, value);
    entry.historyLimit = limit;
    const saved = await window.passwordApi.save(entry);
    entries = saved;
    await loadHistory(entry.id);
});

lockBtn.addEventListener('click', () => {
    if (dirty && !confirm('Lock app and discard unsaved changes?')) {
        return;
    }
    lockApp();
});

copyNameBtn.addEventListener('click', async () => {
    const name = (document.getElementById('name') as HTMLInputElement).value;
    if (!name) {
        return;
    }
    try {
        await navigator.clipboard.writeText(name);
        const icon = copyNameBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
    } catch (err) {
        alert('Failed to copy to clipboard');
    }
});

copyCategoryBtn.addEventListener('click', async () => {
    const category = (document.getElementById('category') as HTMLInputElement).value;
    if (!category) {
        return;
    }
    try {
        await navigator.clipboard.writeText(category);
        const icon = copyCategoryBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
    } catch (err) {
        alert('Failed to copy to clipboard');
    }
});

copyUsernameBtn.addEventListener('click', async () => {
    const username = (document.getElementById('username') as HTMLInputElement).value;
    if (!username) {
        return;
    }
    try {
        await navigator.clipboard.writeText(username);
        const icon = copyUsernameBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
    } catch (err) {
        alert('Failed to copy to clipboard');
    }
});

copyPasswordBtn.addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password) {
        return;
    }
    try {
        await navigator.clipboard.writeText(password);
        const icon = copyPasswordBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
            }, 1000);
        }
    } catch (err) {
        alert('Failed to copy to clipboard');
    }
});

launchUrlBtn.addEventListener('click', async () => {
    const url = (document.getElementById('url') as HTMLInputElement).value;
    if (!url) {
        return;
    }
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
    }
    try {
        await window.passwordApi.openExternal(finalUrl);
    } catch (err) {
        alert('Failed to open URL');
    }
});

exportCsvBtn.addEventListener('click', async () => {
    const success = await window.passwordApi.exportCSV();
    if (success) {
        await showAlert('Passwords exported successfully!', 'Export Complete');
    }
});

importCsvBtn.addEventListener('click', async () => {
    if (dirty && !confirm('Discard unsaved changes before importing?')) {
        return;
    }

    const result = await window.passwordApi.importCSV();
    if (result.success) {
        await showAlert(`Successfully imported ${result.count} password(s)!`, 'Import Complete');
        await loadEntries();
    } else if (result.error) {
        alert(`Import failed: ${result.error}`);
    }
});

function lockApp() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    isUnlocked = false;
    entries = [];
    filteredEntries = [];
    selectedIndex = -1;
    dirty = false;
    gridBody.innerHTML = '';
    clearForm();
    searchInput.value = '';

    const masterModal = document.getElementById('master-password-modal') as HTMLDivElement;
    const createForm = document.getElementById('master-password-create-form') as HTMLDivElement;
    const verifyForm = document.getElementById('master-password-verify-form') as HTMLDivElement;
    const verifyInput = document.getElementById('master-password-verify-input') as HTMLInputElement;
    const errorMsg = document.getElementById('master-password-error') as HTMLParagraphElement;

    createForm.style.display = 'none';
    verifyForm.style.display = 'block';
    masterModal.style.display = 'flex';
    masterModal.classList.remove('hidden');
    errorMsg.style.display = 'none';
    verifyInput.value = '';
    verifyInput.focus();
}

async function initializeMasterPassword() {
    const masterModal = document.getElementById('master-password-modal') as HTMLDivElement;
    const createForm = document.getElementById('master-password-create-form') as HTMLDivElement;
    const verifyForm = document.getElementById('master-password-verify-form') as HTMLDivElement;
    const passwordInput = document.getElementById('master-password-input') as HTMLInputElement;
    const confirmInput = document.getElementById('master-password-confirm') as HTMLInputElement;
    const createBtn = document.getElementById('master-password-create-btn') as HTMLButtonElement;
    const verifyInput = document.getElementById('master-password-verify-input') as HTMLInputElement;
    const verifyBtn = document.getElementById('master-password-verify-btn') as HTMLButtonElement;
    const errorMsg = document.getElementById('master-password-error') as HTMLParagraphElement;

    const attemptVerify = async () => {
        const password = verifyInput.value;
        if (!password) {
            errorMsg.textContent = 'Please enter your password';
            errorMsg.style.display = 'block';
            return;
        }

        const valid = await window.passwordApi.verifyMasterPassword(password);
        if (valid) {
            isUnlocked = true;
            masterModal.style.display = 'none';
            masterModal.classList.add('hidden');
            inactivityTimeoutMinutes = await window.passwordApi.getInactivityTimeout();
            resetInactivityTimer();
            await loadEntries();
        } else {
            errorMsg.textContent = 'Incorrect password';
            errorMsg.style.display = 'block';
            verifyInput.value = '';
            verifyInput.focus();
        }
    };

    verifyBtn.addEventListener('click', attemptVerify);
    verifyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptVerify();
    });

    const attemptCreate = async () => {
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        if (!password || !confirm) {
            alert('Please fill in both fields');
            return;
        }

        if (password !== confirm) {
            alert('Passwords do not match');
            confirmInput.value = '';
            confirmInput.focus();
            return;
        }

        if (password.length < 4) {
            alert('Password must be at least 4 characters');
            return;
        }

        const success = await window.passwordApi.createMasterPassword(password);
        if (success) {
            isUnlocked = true;
            masterModal.style.display = 'none';
            masterModal.classList.add('hidden');
            inactivityTimeoutMinutes = await window.passwordApi.getInactivityTimeout();
            resetInactivityTimer();
            await loadEntries();
        } else {
            alert('Failed to create master password');
        }
    };

    createBtn.addEventListener('click', attemptCreate);
    confirmInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptCreate();
    });

    const hasPassword = await window.passwordApi.checkMasterPassword();

    if (hasPassword) {
        createForm.style.display = 'none';
        verifyForm.style.display = 'block';
        verifyInput.focus();
    } else {
        verifyForm.style.display = 'none';
        createForm.style.display = 'block';
        passwordInput.focus();
    }
}

settingsBtn.addEventListener('click', async () => {
    const currentTimeout = await window.passwordApi.getInactivityTimeout();
    timeoutSelect.value = String(currentTimeout);
    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeLabel.textContent = currentTheme === 'dark' ? 'Dark' : 'Light';
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
});

settingsCloseBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
});

settingsSaveBtn.addEventListener('click', async () => {
    const minutes = parseInt(timeoutSelect.value, 10);
    await window.passwordApi.setInactivityTimeout(minutes);
    inactivityTimeoutMinutes = minutes;
    resetInactivityTimer();
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
});

changeMasterPasswordBtn.addEventListener('click', () => {
    currentMasterPasswordInput.value = '';
    newMasterPasswordInput.value = '';
    confirmNewMasterPasswordInput.value = '';
    changeMasterPasswordError.style.display = 'none';
    changeMasterPasswordModal.classList.remove('hidden');
    changeMasterPasswordModal.setAttribute('aria-hidden', 'false');
    currentMasterPasswordInput.focus();
});

changeMasterPasswordCloseBtn.addEventListener('click', () => {
    changeMasterPasswordModal.classList.add('hidden');
    changeMasterPasswordModal.setAttribute('aria-hidden', 'true');
});

changeMasterPasswordCancelBtn.addEventListener('click', () => {
    changeMasterPasswordModal.classList.add('hidden');
    changeMasterPasswordModal.setAttribute('aria-hidden', 'true');
});

changeMasterPasswordSaveBtn.addEventListener('click', async () => {
    const currentPassword = currentMasterPasswordInput.value;
    const newPassword = newMasterPasswordInput.value;
    const confirmPassword = confirmNewMasterPasswordInput.value;

    changeMasterPasswordError.style.display = 'none';

    if (!currentPassword || !newPassword || !confirmPassword) {
        changeMasterPasswordError.textContent = 'Please fill in all fields';
        changeMasterPasswordError.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        changeMasterPasswordError.textContent = 'New passwords do not match';
        changeMasterPasswordError.style.display = 'block';
        return;
    }

    if (newPassword.length < 4) {
        changeMasterPasswordError.textContent = 'Password must be at least 4 characters';
        changeMasterPasswordError.style.display = 'block';
        return;
    }

    const result = await window.passwordApi.changeMasterPassword(currentPassword, newPassword);

    if (result.success) {
        changeMasterPasswordModal.classList.add('hidden');
        changeMasterPasswordModal.setAttribute('aria-hidden', 'true');
        await showAlert('Master password changed successfully!', 'Success');
    } else {
        changeMasterPasswordError.textContent = result.error || 'Failed to change password';
        changeMasterPasswordError.style.display = 'block';
    }
});

async function initializeTheme() {
    const savedTheme = await window.passwordApi.getTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

function updateThemeButton(theme: string) {
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
        if (theme === 'dark') {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    if (themeLabel) {
        themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
}

async function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    await window.passwordApi.setTheme(newTheme);
    updateThemeButton(newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
    const savedTheme = await window.passwordApi.getTheme();
    if (!savedTheme) {
        const theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeButton(theme);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeMasterPassword();
    setupInactivityListeners();
});
