import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Loading, Logo, cx } from "../components/UI";
import { useAuth } from "../context/AuthContext";

const NAV = [
  ["/how-it-works", "How it works"],
  ["/required-documents", "What you need"],
  ["/faq", "Questions"],
  ["/contact", "Contact"],
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/login" || pathname === "/register") return <Suspense fallback={<Loading />}><Outlet /></Suspense>;

  return (
    <div className="gc-public">
      <a className="gc-skip" href="#main">Skip to main content</a>
      <header className={cx("gc-public-head", scrolled && "is-scrolled")}>
        <div className="gc-public-bar">
          <Logo />
          <button
            type="button"
            className="gc-btn gc-btn--quiet gc-btn--icon gc-public-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="public-navigation"
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          >
            {open ? <X className="gc-icon" aria-hidden="true" /> : <Menu className="gc-icon" aria-hidden="true" />}
          </button>
          <div id="public-navigation" className={cx("gc-public-nav", open && "is-open")}>
            <nav aria-label="Main">
              {NAV.map(([to, text]) => <NavLink key={to} to={to}>{text}</NavLink>)}
            </nav>
            <div className="gc-public-actions">
              {user ? (
                <Link className="gc-btn" to="/portal">Go to your account</Link>
              ) : (
                <>
                  <Link className="gc-btn gc-btn--quiet" to="/login">Sign in</Link>
                  <Link className="gc-btn" to="/portal/claims/new">File a claim</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="gc-public-foot">
        <div className="gc-public-foot-grid">
          <div>
            <Logo inverse />
            <p>Vehicle care, insurance records and motor claims for Indian vehicle owners, in one account.</p>
          </div>
          <nav aria-label="Using getClaim">
            <strong>Using getClaim</strong>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/claim-eligibility">Can I claim?</Link>
            <Link to="/required-documents">What you need</Link>
            <Link to="/services">What getClaim does</Link>
            <Link to="/faq">Questions</Link>
          </nav>
          <nav aria-label="About getClaim">
            <strong>About</strong>
            <Link to="/about">About getClaim</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/surveyor-apply">Surveyors: apply for access</Link>
            <Link to="/privacy-policy">Privacy policy</Link>
          </nav>
          <div>
            <strong>In an emergency</strong>
            <p>For police, fire or ambulance in India, call <a className="gc-link" href="tel:112">112</a>. getClaim can’t send help.</p>
          </div>
        </div>
        <div className="gc-public-foot-base"><span>© {new Date().getFullYear()} getClaim</span><span>A demonstration service. Settlements are simulated and no money is transferred.</span></div>
      </footer>
    </div>
  );
}
