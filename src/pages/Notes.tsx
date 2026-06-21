import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { NoteSidebar } from "../components/notes/NoteSidebar";
import { NoteEditor } from "../components/notes/NoteEditor";
import { QuickSwitcher } from "../components/notes/QuickSwitcher";
import { noteStore } from "../components/notes/noteStore";

// Persist active note across tab switches
let _persistedNoteId: string | null = null;

export function Notes() {
  const { slug } = useParams<{ slug?: string }>();
  const [, forceUpdate] = useState(0);
  const initialized = useRef(false);

  // Subscribe to store
  useEffect(() => {
    const unsub = noteStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      noteStore.loadNotes();
      noteStore.loadFolders();
    }
  }, []);

  // Open note when slug changes from URL
  useEffect(() => {
    if (slug && slug !== _persistedNoteId) {
      _persistedNoteId = slug;
      noteStore.openNote(slug);
    } else if (!slug) {
      // No slug — if we have a persisted note, open it
      if (_persistedNoteId) {
        noteStore.openNote(_persistedNoteId);
      }
    }
  }, [slug]);

  // Persist across tab switches in the same session
  useEffect(() => {
    const handleFocus = () => {
      if (_persistedNoteId && !slug) {
        // We don't navigate here — just ensure note is loaded
        // URL params are more reliable for routing
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [slug]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <NoteSidebar />
      <NoteEditor />
      <QuickSwitcher />
    </div>
  );
}