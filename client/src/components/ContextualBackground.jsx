const artwork = {
  road: <>
    <path d="M388 55C334 187 220 256 225 353C231 448 344 464 327 553C311 641 145 692 169 808C181 865 224 919 191 992" strokeWidth="2" />
    <path d="M349 28C299 157 182 253 191 357C199 465 309 487 292 552C272 627 109 684 137 811C151 875 192 930 160 992" strokeWidth="2" />
    <path d="M367 38C314 173 201 255 207 355C214 456 327 474 310 553C292 633 126 687 153 810C166 870 208 927 176 992" strokeDasharray="9 16" />
    <path d="M413 72C358 199 244 258 247 350C252 437 371 455 349 559C329 655 170 705 190 804M320 11C273 138 153 247 163 361C173 482 279 505 263 555C240 624 77 678 110 818" opacity=".4" />
    <path d="M40 826L99 766M34 870L103 799M265 712L344 633M275 752L355 672M282 246L347 179" opacity=".35" />
    <path d="M274 680C274 666 295 666 295 680C295 689 284 701 284 701S274 689 274 680Z" strokeWidth="2" />
    <circle cx="284" cy="680" r="3" />
  </>,
  coverage: <><circle cx="205" cy="160" r="125"/><circle cx="205" cy="160" r="99"/><circle cx="205" cy="160" r="72"/><path d="M205 9V35M205 285V311M54 160H80M330 160H356M98 53L117 72M293 248L312 267"/><path strokeDasharray="3 8" d="M205 62A98 98 0 0 1 303 160"/><path d="M205 113L238 128V160Q238 194 205 211Q172 194 172 160V128Z"/><path d="M190 159L201 170L222 148"/></>,
  claims: <><path d="M105 42H221L260 81V232H105ZM221 42V81H260M129 110H232M129 133H215M129 156H194"/><path d="M68 92V228M68 117H95M68 171H95M68 225H95"/><circle cx="68" cy="92" r="7"/><circle cx="68" cy="171" r="7"/><circle cx="68" cy="225" r="7"/><path d="M132 193L145 206L171 180M285 104V243H153"/></>,
  vehicle: <><path d="M51 191V163Q51 149 70 145L104 138L132 93Q139 84 153 84H218Q232 84 239 97L260 139L291 151Q308 157 308 174V191H288M98 191H257M51 173H82M283 169H305M113 139H249L226 103H145ZM181 105V139"/><circle cx="89" cy="189" r="21"/><circle cx="276" cy="189" r="21"/><circle cx="89" cy="189" r="9"/><circle cx="276" cy="189" r="9"/><path d="M40 232H321M40 223V241M321 223V241M29 80V208M20 80H38M20 208H38"/><path strokeDasharray="3 7" d="M181 48V247M45 139H322"/></>,
  shield: <><path d="M181 30L268 68V133Q268 211 181 251Q94 211 94 133V68Z"/><path d="M181 58L245 86V136Q245 193 181 224Q117 193 117 136V86Z"/><path d="M151 137L173 159L218 111M62 80H80M282 80H300M62 185H80M282 185H300"/><path strokeDasharray="3 7" d="M181 6V28M181 253V278M31 137H92M270 137H332"/></>,
  documents: <><path d="M92 70H225V238H92ZM116 46H249V214M140 22H273V190M117 106H201M117 130H201M117 154H184M117 200H164"/><path d="M62 98H72M62 126H72M62 154H72M62 182H72M290 58H310M290 82H325M290 106H305"/></>,
  time: <><circle cx="197" cy="141" r="99"/><circle cx="197" cy="141" r="80"/><path d="M197 79V141L237 165M197 42V55M197 227V240M98 141H112M281 141H296"/><path strokeDasharray="2 9" d="M197 25A116 116 0 0 1 313 141"/><path d="M45 191H102V244H45ZM45 205H102M59 183V197M88 183V197M60 219H70M80 219H90M60 231H70"/></>,
  network: <><path d="M58 148L127 72L215 99L287 48M58 148L149 204L215 99L296 182M149 204L296 182M127 72L149 204M215 99L215 258"/><circle cx="58" cy="148" r="13"/><circle cx="127" cy="72" r="9"/><circle cx="215" cy="99" r="23"/><circle cx="287" cy="48" r="8"/><circle cx="149" cy="204" r="14"/><circle cx="296" cy="182" r="11"/><circle cx="215" cy="258" r="7"/><circle cx="215" cy="99" r="38" strokeDasharray="2 8"/></>,
  technical: <><path d="M60 60H300V230H60ZM60 102H300M115 60V230M170 60V230M225 60V230M60 145H300M60 187H300"/><path d="M80 202L131 164L185 178L240 119L281 90"/><circle cx="131" cy="164" r="5"/><circle cx="240" cy="119" r="5"/></>,
};

/** Decorative artwork only: no event handlers, IDs, or meaningful content. */
export default function ContextualBackground({ variant, className = "" }) {
  if (!artwork[variant]) return null;
  return <svg className={`gc-context-art gc-context-art--${variant} ${className}`} viewBox={variant === "road" ? "0 0 360 960" : "0 0 360 300"} preserveAspectRatio={variant === "road" ? "xMaxYMid slice" : "xMidYMid meet"} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{artwork[variant]}</svg>;
}
