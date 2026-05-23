import { useLang } from '@/contexts/LangContext';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.min(total, (page - 1) * pageSize + 1);
  const end = Math.min(total, page * pageSize);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
    minWidth: 32,
    height: 32,
    padding: '0 8px',
    borderRadius: 8,
    border: active ? 'none' : '1px solid var(--border)',
    background: active
      ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))'
      : disabled
        ? 'transparent'
        : 'var(--bg-elevated)',
    color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 800 : 600,
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    opacity: disabled ? 0.45 : 1,
    fontFamily: 'inherit',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '14px 18px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
      borderRadius: '0 0 14px 14px',
    }}>
      {/* Left: info + page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {fr ? `${start}–${end} sur ${total}` : `${start}–${end} من ${total}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fr ? 'Lignes :' : 'صفوف:'}</span>
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          style={btnStyle(false, page === 1)}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          title={fr ? 'Précédent' : 'السابق'}
        >
          {lang === 'ar' ? '›' : '‹'}
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`dots-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: 13 }}>…</span>
            : <button key={p} style={btnStyle(p === page)} onClick={() => onPageChange(p as number)}>{p}</button>
        )}
        <button
          style={btnStyle(false, page === totalPages)}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          title={fr ? 'Suivant' : 'التالي'}
        >
          {lang === 'ar' ? '‹' : '›'}
        </button>
      </div>
    </div>
  );
}

/** Hook to paginate any array */
export function usePagination<T>(items: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    paginated,
    total: items.length,
    setPage,
    setPageSize: handlePageSizeChange,
  };
}

// Need to import useState for the hook
import { useState } from 'react';
