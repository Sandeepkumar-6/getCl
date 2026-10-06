import ContextualBackground from "./ContextualBackground";
import { assets } from "../assets/manifest";
import { useId } from "react";

const designs = ["road", "geometric", "coverage"];

// Choose once per document load, so route changes and React rerenders keep the same design.
function chooseDesign() {
  try {
    const stored = Number(window.sessionStorage.getItem("getclaim.sidebar.nextDesign") || 0);
    const index = Number.isInteger(stored) && stored >= 0 && stored < designs.length ? stored : 0;
    window.sessionStorage.setItem("getclaim.sidebar.nextDesign", String((index + 1) % designs.length));
    return designs[index];
  } catch {
    return designs[0];
  }
}
export const sidebarDesign = chooseDesign();

function Shield({ x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0 -64L58 -41V4Q58 49 0 78Q-58 49 -58 4V-41Z" strokeWidth="3" />
    <path d="M-23 4L-5 22L30 -15" strokeWidth="5" />
  </g>;
}

export default function SidebarArtwork() {
  const vehicleInkId = useId();
  return <div className={`gc-side-map gc-side-map--${sidebarDesign}`} aria-hidden="true">
    {sidebarDesign === "road" ? <ContextualBackground variant="road" /> :
      <svg className="gc-context-art" viewBox="0 0 360 960" preserveAspectRatio={sidebarDesign === "coverage" ? "xMidYMid meet" : "xMaxYMid slice"} fill="none" stroke="currentColor" strokeWidth=".9" aria-hidden="true" focusable="false">
        {sidebarDesign === "geometric" ? <>
          <path d="M270 -30L186 54L288 156L359 85M186 54V177L112 251L202 341L292 251L360 319M288 156V249M112 251V365L41 436L136 531L231 436L360 565M202 341V466M136 531V653L51 738L147 834L243 738L360 855M231 436V555L302 626L243 685V738M41 436V570L-34 645L51 730M147 834V959M302 626L361 685" />
          <path d="M-20 380L365 -5M-20 637L365 252M-20 897L365 512M-20 1127L365 742M-50 60L380 490M-50 300L380 730M-50 540L380 970" opacity=".25" />
          {[[288,156],[112,251],[202,341],[41,436],[231,436],[136,531],[302,626],[51,738],[243,738],[147,834]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="currentColor" stroke="none" />)}
          <Shield x={274} y={660} scale={.7} />
        </> : <>
          <defs><filter id={vehicleInkId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .03  0 0 0 0 .37  0 0 0 0 .6  -.2126 -.7152 -.0722 0 1" /><feComposite in2="SourceAlpha" operator="in" /></filter></defs>
          <path d="M401 296C126 362 122 584 386 696M414 349C184 405 164 579 399 646M-90 768C80 654 238 683 410 809M-80 805C92 699 244 726 425 853M-44 846C115 756 286 780 433 902" opacity=".7" />
          <Shield x={277} y={542} scale={.9} />
          <g transform="translate(360 0) scale(-1 1)"><image href={assets.vehicles.nexon} x="10" y="625" width="340" height="226" className="gc-side-car" filter={`url(#${vehicleInkId})`} /></g>
        </>}
      </svg>}
  </div>;
}
