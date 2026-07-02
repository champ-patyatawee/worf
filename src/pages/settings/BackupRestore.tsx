import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Database, Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function BackupRestore() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleBackup = async () => {
    setMessage(null);
    try {
      const destination = await save({
        defaultPath: 'worf-backup.db',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
      });
      if (!destination) return; // user cancelled

      setBusy(true);
      const result = await invoke<string>('backup_database', { destination });
      setMessage({ type: 'success', text: result });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setMessage(null);
    try {
      const backupPath = await open({
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
        multiple: false,
      });
      if (!backupPath) return; // user cancelled

      // Confirmation
      const confirmed = confirm(
        'Are you sure you want to restore this backup? Your current data will be replaced.'
      );
      if (!confirmed) return;

      setBusy(true);
      const result = await invoke<string>('restore_database', { backupPath });
      setMessage({ type: 'success', text: result + '. You may want to reload the app.' });
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Database className="w-6 h-6" style={{ color: 'var(--color-accent-primary)' }} />
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Backup &amp; Restore
        </h2>
      </div>

      {/* Backup Section */}
      <div className="border-2 rounded-[var(--radius-lg)] p-5 space-y-4"
        style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Backup</h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Save a copy of your entire database (boards, tasks, notes, sprints, OKRs, settings, etc.)
        </p>
        <button
          onClick={handleBackup}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            borderColor: 'var(--color-accent-primary)',
            color: '#fff',
          }}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {busy ? 'Backing up...' : 'Choose Destination & Backup'}
        </button>
      </div>

      {/* Restore Section */}
      <div className="border-2 rounded-[var(--radius-lg)] p-5 space-y-4"
        style={{ borderColor: 'var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Restore</h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Replace your current data with a previously saved backup. This cannot be undone.
        </p>
        <button
          onClick={handleRestore}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] border-2 transition-all hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {busy ? 'Restoring...' : 'Choose Backup File & Restore'}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] border-2"
          style={{
            backgroundColor: message.type === 'success' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(225, 29, 72, 0.08)',
            borderColor: message.type === 'success' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(225, 29, 72, 0.2)',
          }}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#16A34A' }} />
            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#E11D48' }} />
          }
          <span className="text-xs font-semibold" style={{ color: message.type === 'success' ? '#16A34A' : '#E11D48' }}>
            {message.text}
          </span>
        </div>
      )}
    </div>
  );
}
