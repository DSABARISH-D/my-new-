export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark" aria-hidden="true">SF</span>{!compact && <span className="brand-name">Sabarish <b>Fast Food</b></span>}</div>
}
