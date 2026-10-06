
function PolicyList({ items }) {
  return <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>;
}

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: <>
      <h3>Account Information</h3>
      <PolicyList items={["Full name", "Email address", "Mobile number", "Account type", "Profile information", "Authentication information"]}/>
      <h3>Vehicle Information</h3>
      <PolicyList items={["Vehicle make and model", "Registration number", "Vehicle identification information", "Insurance policy details", "Vehicle-related documents"]}/>
      <h3>Insurance and Claim Information</h3>
      <PolicyList items={["Policy details", "Claim details", "Incident date and time", "Incident description", "Damage information", "Claim photographs", "Supporting documents", "Survey and assessment information", "Claim status and status history", "Settlement-related information"]}/>
      <h3>Location Information</h3>
      <p>Location information may be processed when required for vehicle, claim, map, or location-related functionality.</p>
      <h3>Payment Information</h3>
      <p>Where payment functionality is provided, information necessary to process or record payments may be collected. Payment credentials should be handled through applicable payment providers.</p>
      <h3>Technical Information</h3>
      <p>We may collect:</p>
      <PolicyList items={["IP address", "Browser and device information", "Operating system", "Login timestamps", "Diagnostic information", "Service usage information"]}/>
    </>,
  },
  {
    id: "how-we-use-your-information",
    title: "2. How We Use Your Information",
    content: <>
      <p>We may use collected information to:</p>
      <PolicyList items={["Create and manage accounts", "Authenticate users", "Manage vehicles and insurance policies", "Submit and process claims", "Verify claim information", "Store and manage documents", "Process claim photographs and evidence", "Track claim progress", "Communicate important updates", "Provide customer support", "Process applicable payments", "Maintain platform security", "Detect unauthorized access or misuse", "Improve our services", "Maintain records required for operational or legal purposes"]}/>
    </>,
  },
  {
    id: "claim-photos-and-documents",
    title: "3. Claim Photos and Documents",
    content: <>
      <p>Users may upload photographs, documents, and other evidence when submitting a claim.</p>
      <p>These files may be used for claim verification, assessment, processing, communication, and maintaining claim records.</p>
      <p>Users should only upload information relevant to their claim.</p>
    </>,
  },
  {
    id: "sharing-of-information",
    title: "4. Sharing of Information",
    content: <>
      <p>getClaim does not sell personal information as a product.</p>
      <p>Information may be shared with authorized parties when necessary to provide the service or comply with applicable requirements, including:</p>
      <PolicyList items={["Insurance-related personnel", "Authorized surveyors", "Field workers", "Customer-support personnel", "Technology and infrastructure providers", "Cloud-storage providers", "Payment providers", "Security providers", "Government or regulatory authorities where legally required"]}/>
      <p>Access should be limited according to the user's role and responsibilities.</p>
    </>,
  },
  {
    id: "role-based-access",
    title: "5. Role-Based Access",
    content: <>
      <p>getClaim uses role-based access controls.</p>
      <p>Users can access information relevant to their account and responsibilities.</p>
      <p>Authorized administrators, surveyors, field workers, and other personnel may access claim, vehicle, policy, or document information only as required for their assigned responsibilities.</p>
    </>,
  },
  {
    id: "data-security",
    title: "6. Data Security",
    content: <>
      <p>We use reasonable technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, loss, or misuse.</p>
      <p>These measures may include authentication controls, password hashing, authorization controls, secure APIs, database access controls, file-access controls, audit records, and security monitoring.</p>
      <p>No internet-based service can guarantee absolute security.</p>
    </>,
  },
  {
    id: "data-retention",
    title: "7. Data Retention",
    content: <>
      <p>Personal information may be retained for as long as reasonably necessary to provide services, process claims, maintain records, resolve disputes, enforce agreements, or comply with applicable legal requirements.</p>
      <p>When information is no longer required, it may be deleted, anonymized, or otherwise handled according to applicable requirements.</p>
    </>,
  },
  {
    id: "privacy-rights-and-choices",
    title: "8. Privacy Rights and Choices",
    content: <>
      <p>Subject to applicable law, users may have rights regarding their personal information, including:</p>
      <PolicyList items={["Requesting information about personal data being processed", "Requesting correction of inaccurate information", "Requesting deletion where applicable", "Withdrawing consent where applicable", "Raising privacy-related complaints", "Requesting assistance regarding personal information"]}/>
    </>,
  },
  {
    id: "cookies-and-similar-technologies",
    title: "9. Cookies and Similar Technologies",
    content: <>
      <p>getClaim may use cookies or similar technologies for:</p>
      <PolicyList items={["Maintaining login sessions", "Remembering preferences", "Security", "Improving usability", "Understanding service usage"]}/>
      <p>Where required, appropriate consent or preference mechanisms may be provided.</p>
    </>,
  },
  {
    id: "third-party-services",
    title: "10. Third-Party Services",
    content: <>
      <p>getClaim may use third-party services for infrastructure, maps, storage, payments, communications, analytics, security, or other functionality.</p>
      <p>Third-party providers may process information according to their own terms and privacy policies.</p>
    </>,
  },
  {
    id: "childrens-privacy",
    title: "11. Children's Privacy",
    content: <>
      <p>getClaim is intended for users who are legally able to use the service.</p>
      <p>We do not knowingly request personal information from children where collection is prohibited by applicable law.</p>
    </>,
  },
  {
    id: "changes-to-this-privacy-policy",
    title: "12. Changes to This Privacy Policy",
    content: <>
      <p>We may update this Privacy Policy when our services, technology, legal requirements, or data-processing practices change.</p>
      <p>The latest version will display the applicable "Last Updated" date.</p>
    </>,
  },
  {
    id: "contact-us",
    title: "13. Contact Us",
    content: <>
      <p>For privacy-related questions or requests:</p>
      <address className="gc-doc-contact">
        <p><strong>Privacy Team:</strong><br/><a href="mailto:privacy@getclaim.in">privacy@getclaim.in</a></p>
        <p><strong>Support:</strong><br/><a href="mailto:getclaimedhelp@gmail.com">getclaimedhelp@gmail.com</a></p>
        <p><strong>Business Address:</strong><br/>[Add actual registered/business address]</p>
      </address>
    </>,
  },
  {
    id: "consent",
    title: "14. Consent",
    content: <>
      <p>Where processing is based on consent, getClaim will provide an appropriate consent mechanism explaining what information is being collected and why it is required.</p>
      <p>Users may withdraw consent through the applicable mechanism, subject to applicable law and the consequences of withdrawal.</p>
    </>,
  },
];

export default function PrivacyPolicy() {
  return <div className="gc-public-main">
    <header className="gc-page-head">
      <div>
        <h1 id="privacy-policy-title">Privacy policy</h1>
        <p>getClaim ("we", "us" or "our") respects your privacy. This policy explains what information we collect, how we use and share it, and how we protect it when you use getClaim.</p>
        <p className="gc-note">Last updated <time dateTime="2026-09-23">23 Sep 2026</time></p>
      </div>
    </header>
    <div className="gc-doc-layout">
      <nav className="gc-doc-toc" aria-label="Privacy policy contents">
        <h2>On this page</h2>
        <ol>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
      </nav>
      <article className="gc-card gc-doc" aria-labelledby="privacy-policy-title">
        {sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          {section.content}
        </section>)}
      </article>
    </div>
  </div>;
}
