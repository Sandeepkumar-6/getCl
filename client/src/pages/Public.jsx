import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, CalendarClock, Car, CheckCircle2, ClipboardCheck, FileText, FolderLock, Gavel,
  Mail, Phone, Scale, ShieldCheck, Users,
} from "lucide-react";
import { Alert, PageHeader } from "../components/UI";
import { useAuth } from "../context/AuthContext";

const STAGE_TEXT = [
  ["Reported", "Tell us what happened, choose the vehicle and the policy that covered it on that date, and add your documents. You can save and finish later."],
  ["Review", "The claims team checks the claim and its documents. If something is missing they ask you, and the claim waits for your reply."],
  ["Survey", "When the loss is ₹50,000 or more, a licensed surveyor is assigned within 24 hours of review, inspects the vehicle and reports within 15 days. Smaller claims skip this stage."],
  ["Decision", "The claims team approves or rejects the claim within 7 days of the survey report, with the reason and the policy clause behind it. You can appeal a rejection."],
  ["Settlement", "You see how the payout was worked out: the assessed cost, depreciation and deductibles. In this demo the settlement is recorded but no money is transferred."],
];

export function Stages({ level = 3, variant }) {
  const Heading = `h${level}`;
  return (
    <ol className={variant === "timeline" ? "gc-stages gc-stages--timeline" : "gc-stages"}>
      {STAGE_TEXT.map(([name, text], i) => (
        <li key={name}>
          <span className="gc-stages-n" aria-hidden="true">{i + 1}</span>
          <div><Heading className="gc-stages-title">{name}</Heading><p>{text}</p></div>
        </li>
      ))}
    </ol>
  );
}

const DOCS = [
  ["Damage to your vehicle", ["Registration certificate (RC)", "Driving licence of the person driving", "Insurance policy schedule", "A photo of the damage from the front", "Repair estimate from the garage, if you have one"]],
  ["Damage to someone else (third party)", ["Registration certificate", "Driving licence", "Insurance policy schedule", "FIR or police report", "Any legal or MACT notice you received"]],
  ["Vehicle stolen", ["Registration certificate", "Insurance policy schedule", "FIR", "Keys and a theft declaration", "Untraced report from the police", "RTO transfer or cancellation papers"]],
];

function InfoCards({ items }) {
  return (
    <div className={`gc-info-grid ${items.length % 3 === 0 ? "gc-info-grid--3" : "gc-info-grid--2"}`}>
      {items.map(([Icon, title, text]) => (
        <article className="gc-card gc-info-card" key={title}>
          <Icon className="gc-icon" aria-hidden="true" />
          <h2>{title}</h2>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

function StartCta() {
  return (
    <section className="gc-cta-band">
      <div><h2>Ready to start?</h2><p>File a claim now and save it to finish later.</p></div>
      <div className="gc-actions"><Link className="gc-btn" to="/portal/claims/new">File a claim</Link><Link className="gc-btn gc-btn--secondary" to="/required-documents">What you need</Link></div>
    </section>
  );
}

export function InfoPage({ page }) {
  if (page === "how-it-works")
    return (
      <div className="gc-public-main">
        <PageHeader title="How a claim works" description="Every claim moves through the same five stages. At each one, getClaim shows what happens next, who does it and by when." />
        <Stages level={2} />
        <div className="gc-grid-2">
          <section className="gc-card">
            <h2>Who does what</h2>
            <ul className="gc-list">
              <li><strong>You</strong> report the claim, add documents and reply to requests.</li>
              <li><strong>The claims team</strong> reviews the claim, assigns a surveyor and decides.</li>
              <li><strong>The surveyor</strong> inspects the vehicle and records the damage and repair cost.</li>
            </ul>
          </section>
          <section className="gc-card">
            <h2>If you disagree</h2>
            <p className="gc-body-text">You can appeal a rejected claim with more evidence. An appeal here doesn’t replace your insurer’s formal grievance process, and getClaim helps you prepare that complaint from the claim’s history.</p>
          </section>
        </div>
        <StartCta />
      </div>
    );
  if (page === "required-documents")
    return (
      <div className="gc-public-main">
        <PageHeader title="What you need to file a claim" description="The documents depend on the kind of claim. You can start without them and add them later; the claim form shows which ones are still missing." />
        <div className="gc-grid-3">
          {DOCS.map(([title, items]) => (
            <section className="gc-card" key={title}>
              <h2>{title}</h2>
              <ul className="gc-checklist">{items.map((i) => <li key={i}><CheckCircle2 className="gc-icon gc-icon--sm" aria-hidden="true" />{i}</li>)}</ul>
            </section>
          ))}
        </div>
        <section className="gc-card">
          <h2>Photos that help the surveyor</h2>
          <div className="gc-grid-2">
            <ul className="gc-list">
              <li>Take them in daylight from about 2 metres away.</li>
              <li>Show the number plate in at least one photo.</li>
              <li>Add the rear, left and right sides when they’re damaged, and the accident spot if it’s safe.</li>
            </ul>
            <ul className="gc-list">
              <li>JPG, PNG or PDF files, up to 8 MB each.</li>
              <li>Keep the originals. Upload clear, uncropped copies.</li>
              <li>If someone was injured or another vehicle was involved, note the FIR or diary number.</li>
            </ul>
          </div>
        </section>
        <StartCta />
      </div>
    );
  if (page === "claim-eligibility")
    return (
      <div className="gc-public-main">
        <PageHeader title="Can I claim?" description="These are general checks. Your issued policy decides what is covered." />
        <InfoCards items={[
          [ShieldCheck, "A policy that covers the date", "The accident date must fall inside the policy period. You can keep an expired policy in your account, but you can’t claim against it."],
          [Car, "A vehicle in your account", "Add the vehicle with its Indian registration number, manufacturer and model."],
          [CalendarClock, "An accident that has happened", "Claims can’t be filed for future dates. Record the real date, time, place and what happened."],
          [FileText, "Enough evidence to review", "At least the RC, driving licence, policy and a front damage photo. Police details are needed when someone was injured or another party was involved."],
        ]} />
        <StartCta />
      </div>
    );
  if (page === "services")
    return (
      <div className="gc-public-main">
        <PageHeader title="What getClaim does" description="Tools for the paperwork and follow-up after a vehicle accident, and for looking after the vehicle in between." />
        <InfoCards items={[
          [ClipboardCheck, "Guided claim filing", "Cashless or reimbursement claims in five steps, saved as you go so you can finish later."],
          [FolderLock, "Documents in one place", "Policy files, vehicle papers, service invoices and claim evidence, grouped by vehicle."],
          [BadgeCheck, "A clear checklist", "The claim form shows which documents are still missing for your kind of claim. It isn’t a prediction of approval."],
          [Users, "Surveyor coordination", "Assigned surveyors book the inspection and submit an itemised assessment in the same claim."],
          [Scale, "Decisions you can read", "Every approval or rejection shows the reason and the policy clause it relies on."],
          [Gavel, "Appeals and complaints", "Appeal a rejection with more evidence, and prepare an insurer complaint from the claim’s history."],
        ]} />
        <StartCta />
      </div>
    );
  return (
    <div className="gc-public-main gc-public-main--narrow">
      <PageHeader title="About getClaim" description="getClaim brings vehicle care, insurance records and claim progress into one account." />
      <section className="gc-card gc-prose">
        <p>After an accident, most people don’t know what comes next or who is dealing with it. getClaim answers that on every screen: where the claim stands, what happens next, who does it and by when.</p>
        <p>Policyholders, surveyors and the claims team work from the same records, and each sees only what their role allows.</p>
        <p>This is a demonstration service. It isn’t an insurer, broker, government service or payment platform, and settlements recorded here don’t move money.</p>
      </section>
      <section className="gc-card" aria-labelledby="about-more">
        <h2 id="about-more">Learn more</h2>
        <ul className="gc-link-list">
          <li><Link className="gc-link gc-link--arrow" to="/how-it-works">How a claim works <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link><span className="gc-note">The five stages, and who acts at each one</span></li>
          <li><Link className="gc-link gc-link--arrow" to="/services">What getClaim does <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link><span className="gc-note">Filing, documents, surveys, decisions and appeals</span></li>
          <li><Link className="gc-link gc-link--arrow" to="/privacy-policy">Privacy policy <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link><span className="gc-note">What we keep, who can see it and how to ask for it</span></li>
        </ul>
      </section>
      <StartCta />
    </div>
  );
}

const FAQS = [
  ["Can I save an unfinished claim?", "Yes. The form keeps your answers on this device as you type. Once you’ve chosen a vehicle and policy, the claim is also saved to your account as a draft. Files you picked but didn’t upload need to be chosen again after a refresh; uploaded files stay with the claim."],
  ["What does the document checklist mean?", "It shows which details and documents are still missing for your kind of claim. It isn’t a prediction of approval, a fraud score or a trust score."],
  ["Who can see my documents?", "You, the surveyor assigned to your claim and the claims team. Other policyholders can’t see your claims, vehicles or documents."],
  ["Can I use an expired policy?", "You can keep an expired policy in your account, but you can’t claim against it. The accident date must fall inside the policy period."],
  ["How is the payout worked out?", "From the surveyor’s assessment, minus depreciation and deductibles, and capped at the insured declared value (IDV). The claim page shows each line. Payment records here don’t start a bank transfer."],
  ["What if my claim is rejected?", "Read the reason and the policy clause on the claim page. You can upload more evidence and appeal. An appeal here is separate from your insurer’s formal grievance process."],
  ["Will I get SMS or email updates?", "Important claim, policy and vehicle events appear in your notifications and are also sent to your registered email and mobile number when those services are set up."],
];

export function FAQ() {
  return (
    <div className="gc-public-main gc-public-main--narrow">
      <PageHeader title="Questions" description="Answers before you start, and along the way." />
      <div className="gc-faq">
        {FAQS.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <section className="gc-card gc-faq-more" aria-labelledby="faq-more">
        <Mail className="gc-icon" aria-hidden="true" />
        <div>
          <h2 id="faq-more">Still have a question?</h2>
          <p className="gc-body-text">Email <a className="gc-link" href="mailto:support@getclaim.in">support@getclaim.in</a> with your claim number if you have one.</p>
        </div>
        <Link className="gc-btn gc-btn--secondary" to="/contact">Contact us</Link>
      </section>
    </div>
  );
}

export function Contact() {
  return (
    <div className="gc-public-main">
      <PageHeader title="Contact" description="Help with your account or a claim, or a question about your data." />
      <Alert tone="warning" title="In an emergency, call 112">getClaim can’t send police, fire or medical help. Move to a safe place first.</Alert>
      <div className="gc-grid-3">
        <section className="gc-card gc-info-card">
          <Mail className="gc-icon" aria-hidden="true" />
          <h2>Account and claims</h2>
          <p><a className="gc-link" href="mailto:support@getclaim.in">support@getclaim.in</a></p>
          <p className="gc-note">Include your claim number, such as GC-2026-01043.</p>
        </section>
        <section className="gc-card gc-info-card">
          <ShieldCheck className="gc-icon" aria-hidden="true" />
          <h2>Privacy</h2>
          <p><a className="gc-link" href="mailto:privacy@getclaim.in">privacy@getclaim.in</a></p>
          <p className="gc-note">For access, correction or deletion of your data.</p>
        </section>
        <section className="gc-card gc-info-card">
          <Phone className="gc-icon" aria-hidden="true" />
          <h2>Common questions</h2>
          <p>Evidence, claim progress and payouts.</p>
          <Link className="gc-link gc-link--arrow" to="/faq">Read the answers <ArrowRight className="gc-icon gc-icon--sm" aria-hidden="true" /></Link>
        </section>
      </div>
    </div>
  );
}

export function NotFound({ denied = false }) {
  const { user } = useAuth();
  return (
    <div className="gc-public-main gc-public-main--narrow gc-account-page">
      <section className="gc-card gc-account-card">
        <h1>{denied ? "You don’t have access to this page" : "We can’t find that page"}</h1>
        <p className="gc-body-text">{denied ? "Your account’s role doesn’t include this page. If you think it should, contact your administrator." : "The link may be old, or the page may have moved."}</p>
        <div className="gc-actions">
          {user ? <Link className="gc-btn" to="/portal">Go to your account</Link> : <Link className="gc-btn" to="/">Go to the home page</Link>}
          {!user && <Link className="gc-btn gc-btn--secondary" to="/login">Sign in</Link>}
        </div>
      </section>
    </div>
  );
}

