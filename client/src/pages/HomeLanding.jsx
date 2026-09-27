import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import LandingProductPreview from "../components/LandingProductPreview";
import { Stages } from "./Public";
import { assets } from "../assets/manifest";
import { useAuth } from "../context/AuthContext";

export default function HomeLanding() {
  const { user } = useAuth();
  return (
    <div className="gc-landing">
      <section className="gc-hero" aria-labelledby="hero-title">
        <img className="gc-hero-photo" src={assets.hero.road} alt="" width="1536" height="1024" fetchPriority="high" />
        <div className="gc-hero-inner">
          <div className="gc-hero-copy">
            <h1 id="hero-title">Know where your claim stands.</h1>
            <p>File a vehicle insurance claim, follow it through every stage, and always see what happens next, who is handling it and by when.</p>
            <div className="gc-actions">
              <Link className="gc-btn gc-btn--lg" to="/portal/claims/new">File a claim <ArrowRight className="gc-icon" aria-hidden="true" /></Link>
              {user ? <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/portal">Go to your account</Link> : <Link className="gc-btn gc-btn--lg gc-btn--secondary" to="/how-it-works">How it works</Link>}
            </div>
            <p className="gc-note">A demonstration service. Settlements are simulated and no money is transferred.</p>
          </div>
          <LandingProductPreview />
        </div>
      </section>

      <section className="gc-landing-section" aria-labelledby="stages-title">
        <div className="gc-landing-head">
          <h2 id="stages-title">Five stages, the same on every screen</h2>
          <p>The stage names you see here are the ones on your claim page, in your notifications and in your claim list.</p>
        </div>
        <Stages />
      </section>

      <section className="gc-landing-section" aria-labelledby="more-title">
        <div className="gc-landing-head">
          <h2 id="more-title">More than the claim</h2>
          <p>Keep what you need for the next claim in the same account.</p>
        </div>
        <div className="gc-grid-3">
          {[
            ["Your vehicles and policies", "Policy dates, cover and the policy file for each vehicle, with a reminder before renewal."],
            ["Service records", "Workshop visits, invoices, odometer readings and your own monthly checks."],
            ["Documents together", "RC, PUC, policy, invoices and claim evidence, grouped by vehicle and ready to download."],
          ].map(([title, text]) => (
            <article className="gc-card gc-info-card" key={title}>
              <CheckCircle2 className="gc-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gc-landing-section">
        <div className="gc-cta-band">
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
