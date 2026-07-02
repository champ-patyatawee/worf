import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Plus, Link, Pencil, Trash2, Columns3, CheckCircle, RefreshCw } from 'lucide-react';
import type { ObjectiveWithKRs, Board } from '../types';
import { KRRow, KRCreateModal, CheckInModal } from '../components/okr';

declare global { interface Window { __persistedOkrId?: string } }

export function OKRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ObjectiveWithKRs | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKRCreate, setShowKRCreate] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await invoke<ObjectiveWithKRs>('get_objective', { id });
      setData(result);
    } catch (err) {
      console.error('Failed to load objective:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadBoards = useCallback(async () => {
    try {
      const boards = await invoke<Board[]>('list_boards');
      setAllBoards(boards);
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  }, []);

  useEffect(() => {
    if (id) window.__persistedOkrId = id;
    loadData();
    loadBoards();
  }, [loadData, loadBoards]);

  const handleUpdateKR = async (krId: string, currentValue: number, confidence?: number | null) => {
    await invoke('update_key_result', { id: krId, currentValue, confidence });
    await loadData();
  };

  const handleDeleteKR = async (krId: string) => {
    await invoke('delete_key_result', { id: krId });
    await loadData();
  };

  const handleLinkBoard = async (boardId: string) => {
    if (!id) return;
    try {
      await invoke('link_board_to_objective', { boardId, objectiveId: id });
      setShowBoardPicker(false);
      await loadData();
    } catch (err) {
      console.error('Failed to link board:', err);
    }
  };

  const handleUnlinkBoard = async (boardId: string) => {
    if (!id) return;
    try {
      await invoke('unlink_board_from_objective', { boardId, objectiveId: id });
      await loadData();
    } catch (err) {
      console.error('Failed to unlink board:', err);
    }
  };

  const handleEditSave = async () => {
    if (!id) return;
    try {
      await invoke('update_objective', {
        id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      });
      setEditingTitle(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update objective:', err);
    }
  };

  const handleDeleteObjective = async () => {
    if (!id) return;
    try {
      await invoke('delete_objective', { id });
      navigate('/okr');
    } catch (err) {
      console.error('Failed to delete objective:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Objective not found.</p>
      </div>
    );
  }

  const { objective, key_results: keyResults, board_ids: boardIds } = data;
  const pct = Math.round(objective.progress * 100);
  const avgConfidence = keyResults.length > 0
    ? Math.round(keyResults.reduce((sum, kr) => sum + (kr.confidence ?? 0), 0) / keyResults.length)
    : null;
  const confColor = avgConfidence == null ? '#9CA3AF' : avgConfidence >= 7 ? '#22C55E' : avgConfidence >= 4 ? '#EAB308' : '#EF4444';
  const confIcon = avgConfidence == null ? null : (
    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: avgConfidence >= 7 ? '#22C55E' : avgConfidence >= 4 ? '#CA8A04' : '#EF4444' }} />
  );

  const linkedBoards = allBoards.filter((b) => boardIds.includes(b.id));
  const unlinkedBoards = allBoards.filter((b) => !boardIds.includes(b.id));

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn">
      <div className="max-w-[800px] mx-auto">
        {/* Back button */}
        <button
          onClick={() => {
            window.__persistedOkrId = undefined;
            navigate('/okr');
          }}
          className="flex items-center gap-1.5 mb-6 text-xs font-bold hover:underline"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to OKRs
        </button>

        {/* Objective header */}
        {editingTitle ? (
          <div className="mb-6 p-5 border-2 border-[#0D0D0D] rounded-[16px] bg-white shadow-[4px_4px_0px_#0D0D0D]">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xl font-extrabold mb-3 px-2 py-1 border-2 border-[#0D0D0D] rounded-[8px] outline-none"
              style={{ color: 'var(--color-text-primary)' }}
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full text-sm px-2 py-1 border-2 border-[#0D0D0D] rounded-[8px] outline-none resize-none mb-3"
              style={{ color: 'var(--color-text-primary)' }}
              placeholder="Description..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingTitle(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button onClick={handleEditSave}
                className="px-3 py-1.5 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all">
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {pct >= 100 ? <CheckCircle className="h-8 w-8" style={{ color: '#22C55E' }} /> : <RefreshCw className="h-8 w-8" style={{ color: '#CA8A04' }} />}
                <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {objective.title}
                </h1>
              </div>
              <span className="font-mono text-xl font-bold flex-shrink-0 ml-3" style={{ color: 'var(--color-accent-primary)' }}>
                {pct}%
              </span>
            </div>

            {objective.description && (
              <p className="text-sm mb-3 ml-10" style={{ color: 'var(--color-text-secondary)' }}>
                {objective.description}
              </p>
            )}

            {/* Large progress bar */}
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border-2 border-[#0D0D0D] mb-3">
              <div
                className="h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 70 ? '#22C55E' : pct >= 40 ? '#EAB308' : '#EF4444',
                }}
              />
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              <span>{objective.quarter} {objective.year}</span>
              <span>·</span>
              <span style={{ color: confColor }}>{confIcon} Confidence: {avgConfidence ?? '—'}/10</span>
              <span>·</span>
              <span>{keyResults.length} {keyResults.length === 1 ? 'KR' : 'KRs'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditTitle(objective.title);
                  setEditDescription(objective.description ?? '');
                  setEditingTitle(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDeleteObjective}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-red-100 text-red-600 hover:bg-red-200 transition-all">
                    Confirm Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white text-red-500 hover:bg-red-50 shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* Key Results section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Key Results
            </h2>
            <button
              onClick={() => setShowKRCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0D0D0D] transition-all"
            >
              <Plus className="h-3 w-3" /> Add KR
            </button>
          </div>

          {keyResults.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-[12px]">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                No key results yet. Add your first KR to track progress.
              </p>
              <button
                onClick={() => setShowKRCreate(true)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white mx-auto hover:opacity-90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Key Result
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {keyResults.map((kr) => (
                <KRRow
                  key={kr.id}
                  keyResult={kr}
                  onUpdate={handleUpdateKR}
                  onDelete={handleDeleteKR}
                />
              ))}
            </div>
          )}
        </div>

        {/* Check-in prompt */}
        {keyResults.length > 0 && (
          <div className="mb-8 p-4 border-2 border-[#0D0D0D] rounded-[12px] bg-amber-50 shadow-[3px_3px_0px_#0D0D0D]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  <Columns3 className="h-4 w-4 inline" /> Weekly Check-in
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  Update your progress and confidence for this week.
                </p>
              </div>
              <button
                onClick={() => setShowCheckIn(true)}
                className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-all shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#0D0D0D]"
              >
                Check In
              </button>
            </div>
          </div>
        )}

        {/* Linked Boards section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Linked Boards
            </h2>
            <button
              onClick={() => { loadBoards(); setShowBoardPicker(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white shadow-[2px_2px_0px_#0D0D0D] hover:shadow-[3px_3px_0px_#0D0D0D] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all"
            >
              <Link className="h-3 w-3" /> Link Board
            </button>
          </div>

          {boardIds.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-[12px]">
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                No boards linked yet. Link a board to connect work to this objective.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedBoards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between p-3 border-2 border-[#0D0D0D] rounded-[10px] bg-white shadow-[2px_2px_0px_#0D0D0D]"
                >
                  <button
                    onClick={() => navigate(`/project/${board.slug}`)}
                    className="flex items-center gap-2 min-w-0 hover:underline"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {board.name}
                    </span>
                  </button>
                  <button
                    onClick={() => handleUnlinkBoard(board.id)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline px-2 py-1"
                  >
                    Unlink
                  </button>
                </div>
              ))}
              {linkedBoards.length < boardIds.length && (
                <p className="text-xs italic mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Some linked boards were not found.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KR Create Modal */}
      {id && (
        <KRCreateModal
          isOpen={showKRCreate}
          onClose={() => setShowKRCreate(false)}
          onCreated={loadData}
          objectiveId={id}
        />
      )}

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        onCheckedIn={loadData}
        keyResults={keyResults}
      />

      {/* Board picker dialog */}
      {showBoardPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowBoardPicker(false)}>
          <div className="w-[380px] rounded-[12px] border-2 border-[#0D0D0D] p-5 shadow-[6px_6px_0px_#0D0D0D] animate-scaleIn bg-white"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-base mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Link a Board
            </h3>
            {unlinkedBoards.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                {allBoards.length === 0
                  ? 'No boards available. Create a board first.'
                  : 'All boards are already linked.'}
              </p>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {unlinkedBoards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => handleLinkBoard(board.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-[8px] border-2 border-[#0D0D0D] hover:bg-gray-100 transition-all text-left"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{board.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowBoardPicker(false)}
                className="px-4 py-2 text-xs font-bold rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-gray-100 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}