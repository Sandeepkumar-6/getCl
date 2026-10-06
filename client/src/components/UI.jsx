import { Children, Component, cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, CircleX, Clock3, Copy, FolderOpen, Info, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { plate as formatPlate } from "../utils/format";
import { statusInfo } from "../utils/status";
import { assets } from "../assets/manifest";
import ContextualBackground from "./ContextualBackground";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Logo({ inverse = false, to = "/" }) {
  return (
    <Link className={cx("gc-logo", inverse && "gc-logo--inverse")} to={to} aria-label="getClaim home">
      <img src={assets.brand.markPng} alt="" width="30" height="33" />
      <span aria-hidden="true">get<span>Claim</span></span>
    </Link>
  );
}

const FAMILY_ICON = { action: AlertTriangle, progress: Clock3, positive: CheckCircle2, critical: CircleX };

export function StatusChip({ status, kind = "claim", label, family, role }) {
  const auth = useAuth();
  const info = statusInfo(status, { kind, role: role || auth?.user?.role });
  const fam = family || info.family;
  const Icon = FAMILY_ICON[fam];
  return (
    <span className={`gc-status gc-status--${fam}`}>
      {Icon ? <Icon className="gc-icon" aria-hidden="true" /> : <span className="gc-status-dash" aria-hidden="true" />}
      {label || info.label}
    </span>
  );
}
// Older name kept for callers that pass only a status value.
export const Badge = StatusChip;

export function Plate({ registration, type, size }) {
  const text = formatPlate(registration);
  const variant = type === "commercial" ? "gc-plate--commercial" : type === "ev" ? "gc-plate--ev" : "";
  if (!registration) return null;
  return (
    <span className={cx("gc-plate", variant, size === "lg" && "gc-plate--lg")} role="img" aria-label={`Registration ${text}`}>
      <span className="gc-plate-band" aria-hidden="true" />
      <span className="gc-plate-num" aria-hidden="true">{text}</span>
    </span>
  );
}
export const plateType = (vehicle) => (vehicle?.fuelType === "Electric" ? "ev" : undefined);

export function Loading({ label = "Loading…", block = true }) {
  return (
    <div className={cx("gc-loading", block && "gc-loading--block")} role="status">
      <span className="gc-spinner" aria-hidden="true" /> {label}
    </div>
  );
}

export function ErrorState({ message, retry }) {
  return (
    <div role="alert" className="gc-alert gc-alert--error" data-load-error>
      <CircleX className="gc-icon" aria-hidden="true" />
      <div>
        <strong>We couldn’t load this</strong>
        <p>{message}</p>
      </div>
      {retry ? <button type="button" onClick={retry} className="gc-btn gc-btn--secondary gc-btn--sm">Try again</button> : <span />}
    </div>
  );
}

export function Alert({ tone = "info", title, children, action, role }) {
  const Icon = { info: Info, warning: AlertTriangle, error: CircleX, success: CheckCircle2 }[tone] || Info;
  return (
    <div className={cx("gc-alert", tone !== "info" && `gc-alert--${tone}`)} role={role || (tone === "error" ? "alert" : "status")}>
      <Icon className="gc-icon" aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children && (typeof children === "string" ? <p>{children}</p> : <div className="gc-alert-body">{children}</div>)}
      </div>
      {action || <span />}
    </div>
  );
}

export function Empty({ title = "Nothing here yet", description, action, icon: Icon = FolderOpen, level = 3 }) {
  const Heading = `h${level}`;
  return (
    <section className="gc-empty">
      <Icon className="gc-icon" aria-hidden="true" />
      <Heading className="gc-empty-title">{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function PageHeader({ title, description, action, meta, visual }) {
  return (
    <header className={cx("gc-page-head", visual && "gc-context-head", visual && `gc-context-head--${visual}`)}>
      {visual && <ContextualBackground variant={visual} />}
      <div>
        <h1>{title}</h1>
        {meta && <div className="gc-title-meta">{meta}</div>}
        {description && <p>{description}</p>}
      </div>
      {action && <div className="gc-page-actions">{action}</div>}
    </header>
  );
}

// A labelled control. Pass a child control, or input props directly.
export function Field({ label: caption, error, hint, optional, counter, children, id, className, ...props }) {
  const autoId = useId();
  const child = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const inputId = child?.props.id || id || autoId;
  const described = [hint && `${inputId}-hint`, error && `${inputId}-error`, counter && `${inputId}-count`].filter(Boolean).join(" ") || undefined;
  const control = child
    ? cloneElement(child, { id: inputId, "aria-describedby": cx(child.props["aria-describedby"], described) || undefined, "aria-invalid": error ? true : child.props["aria-invalid"] })
    : children || <input id={inputId} aria-describedby={described} aria-invalid={error ? true : undefined} {...props} />;
  const required = props.required || child?.props.required;
  return (
    <div className={cx("gc-field", className)}>
      <label className="gc-field-label" htmlFor={inputId}>
        {caption}
        {optional && !required && <span className="gc-optional"> (optional)</span>}
      </label>
      {hint && <p className="gc-field-hint" id={`${inputId}-hint`}>{hint}</p>}
      {control}
      {(error || counter) && (
        <div className="gc-field-foot">
          {error && <p className="gc-field-error" id={`${inputId}-error`} role="alert"><CircleX className="gc-icon" aria-hidden="true" />{error}</p>}
          {counter && <span className={cx("gc-counter", counter.met && "is-met")} id={`${inputId}-count`}>{counter.text}</span>}
        </div>
      )}
    </div>
  );
}

export function Checkbox({ children, ...props }) {
  return <label className="gc-check"><input type="checkbox" {...props} /><span>{children}</span></label>;
}

export function Stat({ title, value, icon: Icon, note, tone }) {
  return (
    <article className={cx("gc-stat", tone && `is-${tone}`)}>
      <div className="gc-stat-top"><span>{title}</span>{Icon && <Icon className="gc-icon" aria-hidden="true" />}</div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

export function Facts({ items, columns }) {
  const rows = items.filter(Boolean);
  return (
    <dl className={cx("gc-facts", columns === 1 && "gc-facts--one")}>
      {rows.map(([term, value, wide]) => (
        <div key={term} className={wide ? "is-wide" : undefined}>
          <dt>{term}</dt>
          <dd>{value === undefined || value === null || value === "" ? "—" : value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Reason({ children }) {
  return <p className="gc-reason">{children}</p>;
}

export function CopyButton({ value, label = "Copy" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Copy isn’t available here. Select the number and copy it yourself.");
    }
  };
  return (
    <button type="button" className="gc-btn gc-btn--quiet gc-btn--sm" onClick={copy} aria-label={`${label} ${value}`}>
      {done ? <Check className="gc-icon gc-icon--sm" aria-hidden="true" /> : <Copy className="gc-icon gc-icon--sm" aria-hidden="true" />}
      {done ? "Copied" : label}
    </button>
  );
}

// Confirmation dialog. children receives open(). Optional reason field is passed to onConfirm.
export function Confirm({ title, description, onConfirm, children, danger = true, confirmLabel = "Confirm", reason }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const dialog = useRef(null);
  const trigger = useRef(null);
  const titleId = useId();
  const close = () => {
    setOpen(false);
    setText("");
    requestAnimationFrame(() => trigger.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector("textarea, .gc-btn--secondary")?.focus();
  }, [open]);
  const tooShort = reason && text.trim().length < (reason.minLength || 1);
  return (
    <>
      {children(() => { trigger.current = document.activeElement; setOpen(true); })}
      {open && (
        <div
          className="gc-modal"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) { close(); return; }
            if (e.key === "Tab") {
              const controls = [...dialog.current.querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")];
              const first = controls[0], last = controls.at(-1);
              if (!first) e.preventDefault();
              else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
              else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }}
        >
          <section role="alertdialog" ref={dialog} aria-modal="true" aria-busy={busy} aria-labelledby={titleId} className="gc-dialog">
            <button type="button" className="gc-btn gc-btn--quiet gc-btn--icon gc-dialog-close" aria-label="Close dialog" disabled={busy} onClick={close}><X className="gc-icon" aria-hidden="true" /></button>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
            {reason && (
              <Field label={reason.label} hint={reason.hint} counter={reason.minLength ? { text: `${text.trim().length} characters · ${reason.minLength} minimum`, met: !tooShort } : undefined}>
                <textarea className="gc-textarea" rows="3" value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
            )}
            <div className="gc-dialog-actions">
              <button type="button" className="gc-btn gc-btn--secondary" disabled={busy} onClick={close}>Cancel</button>
              <button
                type="button"
                className={cx("gc-btn", danger && "gc-btn--danger")}
                disabled={busy || tooShort}
                aria-busy={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await onConfirm(reason ? text.trim() : undefined); close(); }
                  catch { /* the caller shows its own error */ }
                  finally { setBusy(false); }
                }}
              >
                {busy ? "Please wait…" : confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link className="gc-link gc-link--arrow" to={to}>
      {children}
      <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" />
    </Link>
  );
}

export class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    return this.state.error ? (
      <main className="gc-public-main">
        <ErrorState message="Something on this screen went wrong. Reload the page to continue where you left off." retry={() => window.location.reload()} />
      </main>
    ) : (
      this.props.children
    );
  }
}
