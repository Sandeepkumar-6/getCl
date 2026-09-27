import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Check, ClipboardCheck, FolderOpen, History, SearchCheck, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { StatusChip } from "../components/UI";
import LandingProductPreview from "../components/LandingProductPreview";
import { Stages } from "./Public";
import { assets } from "../assets/manifest";
import { useAuth } from "../context/AuthContext";

// Service rules from the stage descriptions (STAGE_TEXT in Public.jsx), not marketing figures.
const RULES = [
  ["5", "Stages", "Reported, Review, Survey, Decision, Settlement"],
  ["₹50,000", "Survey threshold", "Smaller losses skip the survey"],
  ["24 h", "To assign a surveyor", "After review, when a survey is needed"],
  ["7 days", "To decide", "After the survey report, with the reason"],
];

const ROLES = [
  [UserRound, "You, the policyholder", "Report the accident, upload photos and documents, answer questions from the claims team and follow every stage."],
  [ClipboardCheck, "The claims team", "Reviews each claim, asks for anything missing, assigns a surveyor when needed and records the decision with the policy clause behind it."],
  [SearchCheck, "Licensed surveyors", "Inspect the vehicle, assess the loss and file the survey report inside the same claim."],
];

const TRACK = [
  [CalendarClock, "The next step and its due date", "Every claim shows one next step: what it is, who does it and by when."],
  [UserRound, "Who is handling it", "The claims team member or surveyor on your claim, once one is assigned."],
  [History, "A full history", "Each status change with its note and date, from the day you report it."],
  [FolderOpen, "Your evidence in one place", "Photos and documents you uploaded, and anything the claims team asked for."],
];

// A static sample history in the same timeline style as the claim page. Not a real record.
const SAMPLE_HISTORY = [
  ["Information requested", "Upload a clear photo of the number plate.", "24 Sep 2026, 11:20 am"],
  ["Under review", "The claims team is checking your documents.", "23 Sep 2026, 4:05 pm"],
  ["Submitted", "Claim GC-2026-01043 received with 4 documents.", "22 Sep 2026, 8:00 am"],
];

// Sections fade in once as they scroll into view. Content stays visible without JavaScript
// or when the person prefers reduced motion.
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = root.querySelectorAll(".gc-reveal");
    root.classList.add("gc-motion");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const KEEP = [
  [ShieldCheck, "Vehicles and policies", "Policy dates, cover and the policy file for each vehicle, with a reminder before renewal."],
  [Wrench, "Service records", "Workshop visits, invoices, odometer readings and your own monthly checks."],
  [FolderOpen, "Documents together", "RC, PUC, policy, invoices and claim evidence, grouped by vehicle and ready to download."],
];

export default function HomeLanding() {
  const { user } = useAuth();
  const ref = useReveal();
  return (
    <div className="gc-landing" ref={ref}>
      <section className="gc-hero" aria-labelledby="hero-title">
        <div className="gc-hero-inner">
          <div className="gc-hero-copy">
            <p className="gc-hero-eyebrow">Vehicle insurance claims</p>
            <h1 id="hero-title">Know where your claim stands.</h1>
            <p className="gc-hero-lead">File a vehicle insurance claim, follow it through every stage, and always see what happens next, who is handling it and by when.</p>
            <div className="gc-actions">
              <Link className="gc-btn gc-btn--lg" to="/portal/claims/new">File a claim <ArrowRight className="gc-icon" aria-hidden="true" /></Link>
              {user ? <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/portal">Go to your account</Link> : <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/how-it-works">How it works</Link>}
            </div>
            <ul className="gc-hero-points">
              {["Save a claim and finish it later", "See what is needed from you and by when", "Appeal a rejection from the claim page"].map((point) => (
                <li key={point}><Check className="gc-icon" aria-hidden="true" />{point}</li>
              ))}
            </ul>
          </div>
          <div className="gc-hero-media">
            <picture>
              <source media="(max-width: 767px)" srcSet={assets.hero.landingSm} />
              <img className="gc-hero-photo" src={assets.hero.landing} alt="" width="1152" height="768" fetchPriority="high" />
            </picture>
            <LandingProductPreview />
          </div>
        </div>
        <p className="gc-hero-note">A demonstration service. Settlements are simulated and no money is transferred.</p>
      </section>

      <section className="gc-landing-facts" aria-label="How claims are handled">
        <dl className="gc-landing-facts-grid">
          {RULES.map(([value, term, note]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd><strong>{value}</strong><span>{note}</span></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="gc-landing-section gc-reveal" aria-labelledby="stages-title">
        <div className="gc-landing-head">
          <p className="gc-kicker">How a claim moves</p>
          <h2 id="stages-title">Five stages, the same on every screen</h2>
          <p>The stage names you see here are the ones on your claim page, in your notifications and in your claim list.</p>
        </div>
        <Stages variant="timeline" />
        <Link className="gc-text-link" to="/how-it-works">Read how each stage works <ArrowRight className="gc-icon" aria-hidden="true" /></Link>
      </section>

      <section className="gc-landing-section gc-reveal" aria-labelledby="track-title">
        <div className="gc-track">
          <div className="gc-track-copy">
            <div className="gc-landing-head">
              <p className="gc-kicker">Tracking your claim</p>
              <h2 id="track-title">One page that answers “what now?”</h2>
              <p>Your claim page keeps the status in plain words, and you get a notification whenever it changes.</p>
            </div>
            <ul className="gc-track-list">
              {TRACK.map(([Icon, title, text]) => (
                <li key={title}>
                  <span className="gc-keep-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <figure className="gc-track-visual" aria-label="Sample claim history, not a real record">
            <div className="gc-track-card" aria-hidden="true" inert>
              <div className="gc-track-card-head">
                <div><span className="gc-ref">GC-2026-01043</span><p className="gc-note">Tata Nexon · Collision</p></div>
                <StatusChip status="MORE_INFORMATION_REQUIRED" role="POLICYHOLDER" />
              </div>
              <p className="gc-track-card-label">History</p>
              <ol className="gc-timeline">
                {SAMPLE_HISTORY.map(([status, note, when]) => (
                  <li key={status}><span className="gc-timeline-dot" /><div><strong>{status}</strong><p>{note}</p><span className="gc-note">{when}</span></div></li>
                ))}
              </ol>
            </div>
            <figcaption className="gc-caption">Sample claim history, not a real record</figcaption>
          </figure>
        </div>
      </section>

      <section className="gc-landing-section gc-reveal" aria-labelledby="roles-title">
        <div className="gc-landing-head">
          <p className="gc-kicker">Who works on your claim</p>
          <h2 id="roles-title">Everyone on one claim record</h2>
          <p>Each person works on the same claim, documents and history, limited to what their role allows.</p>
        </div>
        <div className="gc-roles">
          {ROLES.map(([Icon, title, text]) => (
            <article className="gc-role" key={title}>
              <span className="gc-role-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className="gc-roles-foot">Are you a licensed surveyor? <Link className="gc-link" to="/surveyor-apply">Apply for access</Link></p>
      </section>

      <section className="gc-landing-section gc-reveal" aria-labelledby="more-title">
        <div className="gc-keep">
          <figure className="gc-keep-visual">
            <img src={assets.vehicles.nexonLg} alt="" width="1260" height="763" loading="lazy" />
            <figcaption className="gc-caption">Illustration. Your vehicle page shows your own photo when you add one.</figcaption>
          </figure>
          <div className="gc-keep-copy">
            <div className="gc-landing-head">
              <p className="gc-kicker">More than the claim</p>
              <h2 id="more-title">Ready for the next claim before it happens</h2>
              <p>Keep what you need in the same account, so a claim starts with the paperwork already in place.</p>
            </div>
            <ul className="gc-keep-list">
              {KEEP.map(([Icon, title, text]) => (
                <li key={title}>
                  <span className="gc-keep-icon"><Icon className="gc-icon" aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="gc-landing-section gc-reveal">
        <div className="gc-cta-band gc-cta-band--photo">
          <img className="gc-cta-photo" src={assets.hero.landingCta} alt="" width="1600" height="900" loading="lazy" />
          <div>
            <h2>Keep these ready before you start</h2>
            <p>Registration certificate, driving licence, policy schedule and clear photos of the damage. You can add them later.</p>
          </div>
          <div className="gc-actions">
            <Link className="gc-btn" to="/required-documents">See the full list</Link>
            <Link className="gc-btn gc-btn--secondary" to="/claim-eligibility">Can I claim?</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
