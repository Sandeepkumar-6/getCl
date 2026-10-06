import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarClock, Check, ClipboardCheck, FilePlus2, FileText, FolderOpen, IndianRupee, LineChart,
  Lock, SearchCheck, ShieldCheck, UserRound, Wrench,
} from "lucide-react";
import LandingProductPreview from "../components/LandingProductPreview";
import { FAQS, Stages } from "./Public";
import { assets } from "../assets/manifest";
import { useAuth } from "../context/AuthContext";

// Every figure and promise on this page comes from the stage rules in Public.jsx
// (STAGE_TEXT) or from features the portal has. No marketing statistics.
const FEATURES = [
  [FilePlus2, "Easy claim filing", "Report in five steps and save a draft to finish later."],
  [LineChart, "Real-time tracking", "The stage, next step and due date change as your claim moves."],
  [Lock, "Secure & reliable", "Only you, your surveyor and the claims team see your documents."],
  [CalendarClock, "Clear deadlines", "A surveyor within 24 hours, a decision within 7 days of the report."],
];

const STEPS = [
  [FilePlus2, "File a claim", "Tell us what happened and add your documents."],
  [ClipboardCheck, "Verification", "The claims team checks the claim and asks if anything is missing."],
  [SearchCheck, "Processing", "A survey for losses of ₹50,000 or more, then a decision with the reason."],
  [IndianRupee, "Settlement", "See how the payout was worked out, line by line."],
];

const FIGURES = [
  ["5", "stages, the same on every screen"],
  ["24 h", "to assign a surveyor after review"],
  ["7 days", "to decide after the survey report"],
];

const AUDIENCES = [
  [UserRound, "For policyholders", "File a claim, upload evidence and follow every stage from one account.", "/register", "Create an account"],
  [ClipboardCheck, "For the claims team", "Review claims, request what is missing, assign surveyors and record decisions.", "/how-it-works", "Learn more"],
  [SearchCheck, "For surveyors", "Inspect vehicles, assess the loss and file survey reports inside the claim.", "/surveyor-apply", "Apply for access"],
];

const KEEP = [
  [ShieldCheck, "Your vehicles and policies", "Policy dates, cover and the policy file for each vehicle, with a reminder before renewal."],
  [Wrench, "Service records", "Workshop visits, invoices, odometer readings and your own monthly checks."],
  [FolderOpen, "Documents together", "RC, PUC, policy, invoices and claim evidence, grouped by vehicle and ready to download."],
];

const faq = (q) => FAQS.find(([question]) => question === q)?.[1];
const QUESTIONS = [
  ["What documents do I need?", "It depends on the claim. For damage to your vehicle: the registration certificate, the driver’s licence, the policy schedule, a photo of the damage from the front and a repair estimate if you have one. Theft and third-party claims also need an FIR."],
  ["How long does a claim take to settle?", "It depends on the claim. When the loss is ₹50,000 or more, a surveyor is assigned within 24 hours of review and reports within 15 days, and the claims team decides within 7 days of that report. Your claim page always shows the next step and its due date."],
  ["Will I get updates on my claim status?", faq("Will I get SMS or email updates?")],
  ["What if my claim is rejected?", faq("What if my claim is rejected?")],
];

const STORY = [
  { label: "Report", number: "01", title: "Start with what happened.", copy: "Add the vehicle, describe the incident and save a draft if you need a break.", note: "A calm start, even on a difficult day.", icon: FilePlus2 },
  { label: "Follow", number: "02", title: "See the next move.", copy: "Your claim shows its current stage, the person handling it and anything they need from you.", note: "No guessing where things stand.", icon: LineChart },
  { label: "Resolve", number: "03", title: "Understand the decision.", copy: "Review the reason and settlement breakdown in the same place as your claim history.", note: "Clarity all the way through.", icon: ClipboardCheck },
];

function ClaimStory() {
  const [active, setActive] = useState(0);
  const moment = STORY[active];
  const Icon = moment.icon;
  return (
    <div className="gc-next-story">
      <div className="gc-next-story-tabs" aria-label="Explore the claim journey">
        {STORY.map((item, i) => <button type="button" key={item.label} className={i === active ? "is-active" : ""} aria-pressed={i === active} onClick={() => setActive(i)}><span>{item.number}</span>{item.label}</button>)}
      </div>
      <div className="gc-next-story-stage" aria-live="polite">
        <div className="gc-next-story-icon"><Icon aria-hidden="true" /></div>
        <p className="gc-next-kicker">{moment.note}</p>
        <h3>{moment.title}</h3>
        <p>{moment.copy}</p>
        <div className="gc-next-story-line" aria-hidden="true"><span style={{ width: `${(active + 1) * 33.333}%` }} /></div>
        <span className="gc-next-story-count">{moment.number} / 03</span>
      </div>
    </div>
  );
}

// Sections fade up once as they scroll into view. Content stays visible without
// JavaScript and when the person prefers reduced motion.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("gc-motion");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    root.querySelectorAll(".gc-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

function SectionHead({ eyebrow, title, id, children, center }) {
  return (
    <div className={center ? "gc-lp-head gc-lp-head--center" : "gc-lp-head"}>
      <p className="gc-lp-eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function AudienceCard({ Icon, title, text, to, cta }) {
  return (
    <article className="gc-lp-card">
      <span className="gc-lp-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {to && <Link className="gc-lp-more" to={to}>{cta} <ArrowRight className="gc-icon" aria-hidden="true" /></Link>}
    </article>
  );
}

export default function HomeLanding() {
  const { user } = useAuth();
  const ref = useReveal();
  return (
    <div className="gc-lp gc-next-home" ref={ref}>
      <section className="gc-lp-hero gc-next-hero" aria-labelledby="hero-title">
        <img className="gc-lp-hero-photo" src={assets.hero.highway} alt="" width="1920" height="768" fetchPriority="high" />
        <div className="gc-lp-hero-inner">
          <div className="gc-lp-hero-copy">
            <p className="gc-lp-eyebrow">The road ahead, made clearer</p>
            <h1 id="hero-title">Know your car.<br /><span>Know your next move.</span></h1>
            <p className="gc-lp-lead">Your vehicle, its papers and every claim in one clear place. When something happens, you’ll know what to do next.</p>
            <div className="gc-actions">
              <Link className="gc-btn gc-btn--lg" to="/portal/claims/new">File a claim <ArrowRight className="gc-icon" aria-hidden="true" /></Link>
              {user
                ? <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/portal">Go to your account</Link>
                : <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/how-it-works">How it works</Link>}
            </div>
            <ul className="gc-lp-pills">
              {["Your vehicle in one place", "A clear next step", "Updates you can follow"].map((p) => (
                <li key={p}><Check className="gc-icon" aria-hidden="true" />{p}</li>
              ))}
            </ul>
          </div>
          <LandingProductPreview />
        </div>
      </section>

      <div className="gc-lp-wrap">
        <ul className="gc-lp-features gc-next-proof gc-reveal" aria-label="What getClaim does">
          {FEATURES.map(([Icon, title, text]) => (
            <li key={title}>
              <span className="gc-lp-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ul>
      </div>

      <section className="gc-lp-section gc-next-journey gc-reveal" aria-labelledby="how-title">
        <SectionHead eyebrow="A claim you can follow" title="From what happened to what’s next." id="how-title">
          One place to report, follow and understand your claim.
        </SectionHead>
        <ClaimStory />
      </section>

      <section className="gc-lp-section gc-next-vehicle gc-reveal" aria-labelledby="why-title">
        <div className="gc-lp-split">
          <div className="gc-lp-split-copy">
            <SectionHead eyebrow="Built around your vehicle" title="A home for everything that keeps you moving." id="why-title">
              See policy details, documents, service records and reminders alongside your claims.
            </SectionHead>
            <dl className="gc-lp-figures">
              {FIGURES.map(([value, label]) => (
                <div key={value}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </div>
          <figure className="gc-lp-split-photo">
            <img src={assets.hero.sunset} alt="" width="1100" height="679" loading="lazy" />
            <figcaption>For the journey between claims, too.</figcaption>
          </figure>
        </div>
      </section>

      <section className="gc-lp-section gc-reveal" aria-labelledby="who-title">
        <SectionHead eyebrow="Built for everyone involved" title="One claim, everyone on the same page" id="who-title" center>
          Each person works on the same claim record, limited to what their role allows.
        </SectionHead>
        <div className="gc-lp-cards gc-lp-cards--3">
          {AUDIENCES.map(([Icon, title, text, to, cta]) => (
            <AudienceCard key={title} Icon={Icon} title={title} text={text} to={to} cta={cta} />
          ))}
        </div>
      </section>

      <section className="gc-lp-section gc-reveal" aria-labelledby="stages-title">
        <SectionHead eyebrow="Claim stages" title="Five stages, the same on every screen" id="stages-title" center>
          The stage names you see here are the ones on your claim page, in your notifications and in your claim list.
        </SectionHead>
        <Stages />
      </section>

      <section className="gc-lp-section gc-reveal" aria-labelledby="more-title">
        <SectionHead eyebrow="More than the claim" title="Everything for the next claim, in one account" id="more-title" center>
          Keep what you need for the next claim in the same account.
        </SectionHead>
        <div className="gc-lp-cards gc-lp-cards--3">
          {KEEP.map(([Icon, title, text]) => (
            <AudienceCard key={title} Icon={Icon} title={title} text={text} />
          ))}
        </div>
      </section>

      <section className="gc-lp-section gc-reveal">
        <div className="gc-lp-cta">
          <div className="gc-lp-cta-copy">
            <FileText className="gc-icon gc-lp-cta-icon" aria-hidden="true" />
            <h2>Keep these ready before you start</h2>
            <p>Registration certificate, driving licence, policy schedule and clear photos of the damage. You can add them later.</p>
            <div className="gc-actions">
              <Link className="gc-btn" to="/required-documents">See the full list</Link>
              <Link className="gc-btn gc-btn--secondary" to="/claim-eligibility">Can I claim?</Link>
            </div>
          </div>
          <img className="gc-lp-cta-photo" src={assets.hero.landing} alt="" width="1152" height="768" loading="lazy" />
        </div>
      </section>

      <section className="gc-lp-section gc-reveal" aria-labelledby="faq-title">
        <div className="gc-lp-faq-head">
          <SectionHead eyebrow="Questions" title="Frequently asked questions" id="faq-title" />
          <Link className="gc-lp-more" to="/faq">View all questions <ArrowRight className="gc-icon" aria-hidden="true" /></Link>
        </div>
        <div className="gc-faq">
          {QUESTIONS.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
