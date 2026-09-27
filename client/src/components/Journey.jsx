import { Link } from "react-router-dom";
import { AlertTriangle, Check, CheckCircle2, Clock3, X } from "lucide-react";
import { journey } from "../utils/status";
import { cx } from "./UI";

// The five-stage progress line: Reported, Review, Survey, Decision, Settlement.
export function ClaimJourney({ claim, role, survey, label = "Claim progress" }) {
  const steps = journey(claim, { role, survey });
  return (
    <div className="gc-journey-wrap">
      <ol className="gc-journey" aria-label={label}>
        {steps.map((step, index) => (
          <li
            key={step.name}
            className={cx(`is-${step.state}`, step.tone && `is-${step.tone}`)}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span className="gc-step-mark">
              {step.state === "complete" ? <Check className="gc-icon" aria-hidden="true" /> :
                step.tone === "action" ? <span aria-hidden="true">!</span> :
                step.tone === "critical" ? <X className="gc-icon" aria-hidden="true" /> :
                step.state === "upcoming" ? index + 1 : null}
            </span>
            <span className="gc-step-text">
              <span className="gc-step-name">{step.name}</span>
              {step.note && <span className="gc-step-note">{step.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const TONE_ICON = { action: AlertTriangle, waiting: Clock3, done: CheckCircle2 };
const TONE_EYEBROW = { action: "Your move", waiting: "What happens next", done: "Done" };

// What happens next, who does it, and by when. One per claim.
export function NextStep({ tone = "waiting", eyebrow, title, children, meta = [], action, id, level = 3 }) {
  const Heading = `h${level}`;
  const Icon = TONE_ICON[tone] || Clock3;
  return (
    <div className="gc-next-wrap">
      <section className={cx("gc-next", tone === "action" && "gc-next--action", tone === "done" && "gc-next--done")} aria-labelledby={id}>
        <span className="gc-next-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
        <div>
          <p className="gc-eyebrow">{eyebrow || TONE_EYEBROW[tone]}</p>
          <Heading id={id} className="gc-next-title">{title}</Heading>
          {children && (typeof children === "string" ? <p>{children}</p> : children)}
          {meta.filter((m) => m && m[1]).length > 0 && (
            <dl className="gc-next-meta">
              {meta.filter((m) => m && m[1]).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
            </dl>
          )}
        </div>
        {action && (
          <div className="gc-next-actions">
            {action.to ? (
              <Link className={cx("gc-btn", tone !== "action" && "gc-btn--secondary")} to={action.to}>{action.icon && <action.icon className="gc-icon" aria-hidden="true" />}{action.label}</Link>
            ) : (
              <button type="button" className={cx("gc-btn", tone !== "action" && "gc-btn--secondary")} onClick={action.onClick}>{action.icon && <action.icon className="gc-icon" aria-hidden="true" />}{action.label}</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
