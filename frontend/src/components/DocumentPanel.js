import React, { useRef, useState } from 'react';
import { FileText, Trash2, Upload, X, CheckCircle, Loader, ChevronRight } from 'lucide-react';
import { uploadPDF, deleteDocument } from '../utils/api';

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;

export default function DocumentPanel({ docs, setDocs, selectedIds, setSelectedIds }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files) => {
    const pdfs = [...files].filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { setUploadError('Only PDF files are supported.'); return; }
    setUploading(true); setUploadError('');
    try {
      const results = await Promise.all(pdfs.map(f => uploadPDF(f)));
      const newDocs = results.map(r => ({
        doc_id: r.doc_id, filename: r.filename,
        chunks: r.chunks, char_count: r.char_count,
      }));
      setDocs(prev => [...prev, ...newDocs]);
      setSelectedIds(prev => [...new Set([...prev, ...newDocs.map(d => d.doc_id)])]);
    } catch (e) { setUploadError(e.message); }
    setUploading(false);
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      setDocs(prev => prev.filter(d => d.doc_id !== docId));
      setSelectedIds(prev => prev.filter(id => id !== docId));
    } catch {}
  };

  const toggleSelect = (docId) => {
    setSelectedIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>Documents</span>
        <span style={styles.docCount}>{docs.length}</span>
      </div>

      {/* Drop zone */}
      <div
        style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple hidden
          onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <div style={styles.uploadingState}>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <span style={styles.uploadText}>Processing PDF…</span>
          </div>
        ) : (
          <>
            <Upload size={18} style={{ color: 'var(--accent)' }} />
            <span style={styles.uploadText}>Drop PDFs or click to upload</span>
          </>
        )}
      </div>

      {uploadError && (
        <div style={styles.error}>
          <X size={13} /> {uploadError}
        </div>
      )}

      {/* Document list */}
      <div style={styles.docList}>
        {docs.length === 0 && (
          <div style={styles.empty}>No documents yet.<br />Upload a PDF to get started.</div>
        )}
        {docs.map(doc => {
          const selected = selectedIds.includes(doc.doc_id);
          return (
            <div
              key={doc.doc_id}
              style={{ ...styles.docItem, ...(selected ? styles.docItemSelected : {}) }}
              onClick={() => toggleSelect(doc.doc_id)}
            >
              <div style={styles.docIcon}>
                <FileText size={14} style={{ color: selected ? 'var(--accent)' : 'var(--text-3)' }} />
              </div>
              <div style={styles.docInfo}>
                <span style={styles.docName} title={doc.filename}>{doc.filename}</span>
                <span style={styles.docMeta}>{doc.chunks} chunks · {fmt(doc.char_count)} chars</span>
              </div>
              {selected && <CheckCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
              <button style={styles.deleteBtn} onClick={e => handleDelete(doc.doc_id, e)} title="Remove">
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div style={styles.selectedInfo}>
          <ChevronRight size={12} />
          {selectedIds.length} doc{selectedIds.length > 1 ? 's' : ''} selected for chat
        </div>
      )}
    </aside>
  );
}

const styles = {
  panel: {
    width: 280, minWidth: 280, background: 'var(--bg-2)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden',
  },
  header: {
    padding: '20px 18px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
  },
  headerLabel: {
    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)',
  },
  docCount: {
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)',
    background: 'var(--bg-4)', padding: '2px 7px', borderRadius: 20,
  },
  dropZone: {
    margin: '14px 14px 0',
    border: '1.5px dashed var(--border-bright)',
    borderRadius: 'var(--radius)',
    padding: '14px 12px',
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', transition: 'all 0.2s',
    background: 'transparent',
  },
  dropZoneActive: {
    borderColor: 'var(--accent)', background: 'var(--accent-glow)',
  },
  uploadingState: { display: 'flex', alignItems: 'center', gap: 10 },
  uploadText: { fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.3 },
  error: {
    margin: '8px 14px 0', padding: '8px 10px',
    background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--radius-sm)',
    color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
  },
  docList: { flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 3 },
  empty: {
    textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5,
    padding: '30px 16px', lineHeight: 1.7,
  },
  docItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 10px', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', transition: 'all 0.15s',
    border: '1px solid transparent',
    ':hover': { background: 'var(--bg-3)' },
  },
  docItemSelected: {
    background: 'rgba(124,106,255,0.08)',
    border: '1px solid rgba(124,106,255,0.22)',
  },
  docIcon: { flexShrink: 0 },
  docInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  docName: {
    fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  docMeta: { fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' },
  deleteBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--text-3)', padding: 3, borderRadius: 4, flexShrink: 0,
    display: 'flex', alignItems: 'center', opacity: 0.6,
    ':hover': { color: 'var(--red)', opacity: 1 },
  },
  selectedInfo: {
    margin: '0 14px 14px', padding: '8px 12px',
    background: 'rgba(124,106,255,0.1)', borderRadius: 'var(--radius-sm)',
    fontSize: 11.5, color: 'var(--accent-2)',
    display: 'flex', alignItems: 'center', gap: 5,
    fontFamily: 'var(--mono)',
  },
};
