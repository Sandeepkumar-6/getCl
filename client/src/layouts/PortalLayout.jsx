import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, CalendarDays, Car, ChevronRight, ClipboardCheck, Files, Folder, History, House, KeyRound,
  LayoutDashboard, LifeBuoy, LogOut, Menu, ShieldCheck, UserCheck, UserCog, UserRound, Users, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Loading, Logo, cx } from "../components/UI";
import { api } from "../services/api";
import { initials, label } from "../utils/format";
import SidebarArtwork, { sidebarDesign } from "../components/SidebarArtwork";

const PortalContext = createContext({ setCrumb: () => {} });
// Pages call this to name the last breadcrumb, e.g. with a claim number.
export function usePortalCrumb(text) {
  const { setCrumb } = useContext(PortalContext);
  useEffect(() => {
    setCrumb(text || "");
    return () => setCrumb("");
  }, [text, setCrumb]);
}

function navFor(role) {
  if (role === "POLICYHOLDER")
    return [
      ["/portal", House, "Home", [/^\/portal\/?$/]],
      ["/portal/claims", Files, "Claims", [/^\/portal\/claims/, /^\/portal\/payments/]],
      ["/portal/vehicles", Car, "Vehicles", [/^\/portal\/vehicles?(\/|$)/]],
      ["/portal/insurance", ShieldCheck, "Policies", [/^\/portal\/insurance/]],
      ["/portal/documents", Folder, "Documents", [/^\/portal\/documents/]],
      ["/portal/reminders", CalendarDays, "Reminders", [/^\/portal\/reminders/]],
      ["/portal/support", LifeBuoy, "Help", [/^\/portal\/(support|claim-help)/]],
    ];
  const admin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  return [
    ["/portal", LayoutDashboard, "Overview", [/^\/portal\/?$/]],
    ["/portal/claims", Files, role === "SURVEYOR" ? "Assignments" : "Claim queue", [/^\/portal\/claims/]],
    ...(role !== "SUPER_ADMIN" ? [["/portal/inspections", ClipboardCheck, "Inspections", [/^\/portal\/inspections/]], ["/portal/documents", Folder, "Documents", [/^\/portal\/documents/]]] : []),
    ...(admin ? [["/portal/staff-approvals", UserCheck, "Surveyors", [/^\/portal\/staff-approvals/]], ["/portal/users", Users, "Policyholders", [/^\/portal\/users/]]] : []),
    ...(role === "SUPER_ADMIN" ? [["/portal/staff", UserCog, "Staff", [/^\/portal\/staff$/]]] : []),
    ...(admin ? [["/portal/audit", History, "Audit log", [/^\/portal\/audit/]]] : []),
  ];
}

function crumbsFor(pathname, role, last) {
  const staff = role !== "POLICYHOLDER";
  const home = [staff ? "Overview" : "Home", "/portal"];
  const claims = [role === "SURVEYOR" ? "Assignments" : staff ? "Claim queue" : "Claims", "/portal/claims"];
  const p = pathname.replace(/\/$/, "");
  const table = [
    [/^\/portal$/, [home]],
    [/^\/portal\/claims$/, [claims]],
    [/^\/portal\/claims\/new$/, [claims, ["File a claim"]]],
    [/^\/portal\/claims\/[^/]+\/edit$/, [claims, [last || "Continue draft"]]],
    [/^\/portal\/claims\/[^/]+/, [claims, [last || "Claim"]]],
    [/^\/portal\/vehicles$/, [["Vehicles"]]],
    [/^\/portal\/vehicles\/[^/]+$/, [["Vehicles", "/portal/vehicles"], [last || "Vehicle"]]],
    [/^\/portal\/vehicle$/, [["Vehicles", "/portal/vehicles"], [last || "Your vehicle"]]],
    [/^\/portal\/insurance$/, [["Policies"]]],
    [/^\/portal\/documents$/, [["Documents"]]],
    [/^\/portal\/reminders$/, [["Reminders"]]],
    [/^\/portal\/payments$/, [claims, ["Payments"]]],
    [/^\/portal\/(activity|notifications)$/, [["Notifications"]]],
    [/^\/portal\/(support|claim-help)$/, [["Help"]]],
    [/^\/portal\/profile$/, [["Profile"]]],
    [/^\/portal\/password$/, [["Profile", "/portal/profile"], ["Change password"]]],
    [/^\/portal\/inspections$/, [["Inspections"]]],
    [/^\/portal\/staff-approvals$/, [["Surveyors"]]],
    [/^\/portal\/users$/, [["Policyholders"]]],
    [/^\/portal\/staff$/, [["Staff"]]],
    [/^\/portal\/audit$/, [["Audit log"]]],
  ];
  const match = table.find(([re]) => re.test(p));
  const trail = match ? match[1] : [home];
  return trail.map(([text, to], i) => ({ text, to: i === trail.length - 1 ? undefined : to }));
}

function AccountMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector("[role=menuitem]")?.focus();
    const outside = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const onKey = (e) => {
    if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const items = [...wrap.current.querySelectorAll("[role=menuitem]")];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };
  return (
    <div className="gc-account" ref={wrap} onKeyDown={onKey}>
      <button ref={button} type="button" className="gc-account-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="gc-avatar" aria-hidden="true">{initials(user.name)}</span>
        <span className="gc-account-name"><strong>{user.name}</strong><small>{label(user.role)}</small></span>
        <span className="gc-sr">Account menu</span>
      </button>
      {open && (
        <div className="gc-menu" role="menu" aria-label="Account">
          <Link role="menuitem" to="/portal/profile" onClick={() => setOpen(false)}><UserRound className="gc-icon" aria-hidden="true" />Profile</Link>
          <Link role="menuitem" to="/portal/password" onClick={() => setOpen(false)}><KeyRound className="gc-icon" aria-hidden="true" />Change password</Link>
          <button role="menuitem" type="button" onClick={logout}><LogOut className="gc-icon" aria-hidden="true" />Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [crumb, setCrumbState] = useState("");
  const [unread, setUnread] = useState(0);
  const menuButton = useRef(null);
  const sidebar = useRef(null);
  const setCrumb = useCallback((text) => setCrumbState(text), []);

  // Unread count for the bell.
  const refreshUnread = useCallback(() => {
    api.get("/notifications").then((r) => {
      const items = Array.isArray(r.data) ? r.data : r.data?.items || [];
      setUnread(items.filter((n) => !n.read).length);
    }).catch(() => {});
  }, []);
  useEffect(() => { refreshUnread(); }, [refreshUnread, location.pathname]);
  useEffect(() => {
    window.addEventListener("notifications-changed", refreshUnread);
    return () => window.removeEventListener("notifications-changed", refreshUnread);
  }, [refreshUnread]);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    sidebar.current?.querySelector("a")?.focus();
    const key = (event) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
      if (event.key === "Tab" && sidebar.current) {
        const items = [...sidebar.current.querySelectorAll("a, button")];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  const signOut = () => { logout(); navigate("/login"); };
  const links = navFor(user.role);
  const crumbs = crumbsFor(location.pathname, user.role, crumb);
  const context = useMemo(() => ({ setCrumb }), [setCrumb]);

  return (
    <PortalContext.Provider value={context}>
      <div className="gc-shell">
        <a className="gc-skip" href="#main">Skip to main content</a>
        <aside ref={sidebar} id="portal-navigation" className={cx("gc-side", `gc-side--${sidebarDesign}`, open && "is-open")} aria-label="Main">
          <div className="gc-side-top">
            <Logo inverse to="/portal" />
            <button type="button" className="gc-side-close gc-btn gc-btn--icon" aria-label="Close menu" onClick={() => { setOpen(false); menuButton.current?.focus(); }}><X className="gc-icon" aria-hidden="true" /></button>
          </div>
          <nav aria-label="Portal">
            {links.map(([to, Icon, name, patterns]) => {
              const active = patterns.some((re) => re.test(location.pathname));
              return (
                <Link key={to} to={to} aria-current={active ? "page" : undefined}>
                  <Icon className="gc-icon" aria-hidden="true" />{name}
                </Link>
              );
            })}
          </nav>
          <SidebarArtwork />
          <button type="button" className="gc-side-signout" onClick={signOut}><LogOut className="gc-icon" aria-hidden="true" />Sign out</button>
        </aside>
        {open && <div className="gc-scrim-layer" aria-hidden="true" onClick={() => { setOpen(false); menuButton.current?.focus(); }} />}
        <div className="gc-shell-main">
          <header className="gc-top">
            <button ref={menuButton} type="button" className="gc-menu-toggle gc-btn gc-btn--quiet gc-btn--icon" aria-label="Open menu" aria-controls="portal-navigation" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu className="gc-icon" aria-hidden="true" />
            </button>
            <span className="gc-top-logo"><Logo to="/portal" /></span>
            <nav aria-label="Breadcrumb" className="gc-top-crumbs">
              <ol className="gc-crumbs">
                {crumbs.map((c, i) => (
                  <li key={`${c.text}-${i}`}>
                    {i > 0 && <ChevronRight className="gc-icon gc-icon--sm" aria-hidden="true" />}
                    {c.to ? <Link to={c.to}>{c.text}</Link> : <span aria-current="page">{c.text}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="gc-top-tools">
              <Link className="gc-btn gc-btn--quiet gc-btn--icon gc-bell" to="/portal/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
                <Bell className="gc-icon" aria-hidden="true" />
                {unread > 0 && <span className="gc-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <AccountMenu user={user} logout={signOut} />
            </div>
          </header>
          <main id="main" className="gc-main" tabIndex={-1}>
            {user.role === "POLICYHOLDER" && !user.emailVerified && (
              <Alert
                tone="warning"
                title="Verify your email to change policies, vehicles or claims"
                action={<Link className="gc-btn gc-btn--secondary gc-btn--sm" to={`/verify-email?email=${encodeURIComponent(user.email)}`}>Send a new link</Link>}
              >
                {`We sent a link to ${user.email}. You can still view everything while you wait.`}
              </Alert>
            )}
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </PortalContext.Provider>
  );
}
