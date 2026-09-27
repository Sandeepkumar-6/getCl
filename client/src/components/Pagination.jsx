export default function Pagination({ data, onPage, noun = "results" }) {
  if (!data || data.pages <= 1) return null;
  return (
    <nav className="gc-pagination" aria-label="Pages">
      <span>{data.total} {noun} · page {data.page} of {data.pages}</span>
      <div className="gc-actions">
        <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous page</button>
        <button type="button" className="gc-btn gc-btn--secondary gc-btn--sm" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next page</button>
      </div>
    </nav>
  );
}
