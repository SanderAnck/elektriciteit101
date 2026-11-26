// SVG drawings of the parts. Each function returns markup in local
// coordinates (centre 0,0, terminals at x = ±60) for one part, given its
// simulated state. No event handling here.

const LEAD = 'stroke="var(--lead)" stroke-width="4" stroke-linecap="round" fill="none"';

// Text that stays upright when the part is rotated.
const label = (x, y, text, rot, cls = 'part-label') =>
  `<text class="${cls}" x="${x}" y="${y}" transform="rotate(${-rot} ${x} ${y})" text-anchor="middle" dominant-baseline="central">${text}</text>`;

const GLOW_R = { zwak: 34, fel: 48, heelfel: 62 };
const GLOW_O = { zwak: 0.45, fel: 0.8, heelfel: 1 };

function battery(p, st) {
  const hot = st?.short;
  return `
    <line x1="-60" y1="0" x2="-40" y2="0" ${LEAD}/>
    <line x1="40" y1="0" x2="60" y2="0" ${LEAD}/>
    ${hot ? '<g class="heat"><path d="M-24 -30 q6 -8 0 -16 q-6 -8 0 -16"/><path d="M0 -30 q6 -8 0 -16 q-6 -8 0 -16"/><path d="M24 -30 q6 -8 0 -16 q-6 -8 0 -16"/></g>' : ''}
    <rect x="-40" y="-18" width="74" height="36" rx="7" fill="${hot ? '#E03131' : '#2B2F3A'}"/>
    <rect x="8" y="-18" width="26" height="36" rx="0" fill="${hot ? '#FF8A80' : '#F2B705'}"/>
    <rect x="30" y="-18" width="4" height="36" fill="${hot ? '#FF8A80' : '#F2B705'}"/>
    <rect x="34" y="-8" width="7" height="16" rx="2" fill="#A7ADB8"/>
    <rect x="-40" y="-18" width="74" height="36" rx="7" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    ${label(21, 0, '+', p.rot, 'part-label part-label--dark')}
    ${label(-24, 0, '−', p.rot, 'part-label part-label--light')}
    ${hot ? label(0, -40, '⚠', p.rot, 'part-warn') : ''}`;
}

function lamp(p, st) {
  const lv = st?.level || 'uit';
  const on = lv !== 'uit';
  return `
    <path d="M-60 0 H-30 Q-16 0 -11 10" ${LEAD}/>
    <path d="M60 0 H30 Q16 0 11 10" ${LEAD}/>
    ${on ? `<circle cx="0" cy="-20" r="${GLOW_R[lv]}" fill="url(#glow-yellow)" opacity="${GLOW_O[lv]}"/>` : ''}
    <circle cx="0" cy="-20" r="22" fill="${on ? '#FFE680' : '#EEF2F7'}" stroke="#8A94A6" stroke-width="2.5"/>
    <path d="M-6 0 L-6 -14 L-3 -24 L0 -16 L3 -24 L6 -14 L6 0" fill="none" stroke="${on ? '#E8590C' : '#7A8394'}" stroke-width="2"/>
    <rect x="-12" y="-2" width="24" height="18" rx="3" fill="#B8BEC9" stroke="#7A8394" stroke-width="2"/>
    <path d="M-12 4 H12 M-12 10 H12" stroke="#7A8394" stroke-width="1.5"/>`;
}

function led(p, st) {
  const lv = st?.level || 'uit';
  const on = lv !== 'uit';
  return `
    <path d="M-60 0 H-8 V-6" ${LEAD}/>
    <path d="M60 0 H8 V-6" ${LEAD}/>
    ${on ? `<circle cx="0" cy="-22" r="${GLOW_R[lv] - 6}" fill="url(#glow-red)" opacity="${GLOW_O[lv]}"/>` : ''}
    <path d="M-14 -6 V-26 A14 14 0 0 1 14 -26 V-6 Z" fill="${on ? '#FF4D4D' : '#B33A3A'}" stroke="#7A1F1F" stroke-width="2" opacity="${on ? 1 : 0.85}"/>
    <rect x="-17" y="-8" width="31" height="6" rx="2" fill="#B33A3A" stroke="#7A1F1F" stroke-width="2"/>
    ${on ? '<ellipse cx="-5" cy="-24" rx="3" ry="6" fill="#fff" opacity=".7"/>' : ''}
    ${label(-36, 16, '+', p.rot, 'part-label part-label--sign')}
    ${label(36, 16, '−', p.rot, 'part-label part-label--sign')}`;
}

function buzzer(p, st) {
  const on = st && st.level !== 'uit';
  return `
    <path d="M-60 0 H-22" ${LEAD}/>
    <path d="M60 0 H22" ${LEAD}/>
    <circle cx="0" cy="0" r="26" fill="#2B2F3A"/>
    <circle cx="0" cy="0" r="18" fill="#3A4050" stroke="#555D70" stroke-width="2"/>
    <circle cx="0" cy="0" r="5" fill="#111"/>
    ${on ? '<g class="waves"><path d="M30 -24 q8 -8 0 -16"/><path d="M38 -28 q12 -10 0 -24"/><path d="M-30 -24 q-8 -8 0 -16"/><path d="M-38 -28 q-12 -10 0 -24"/></g>' : ''}`;
}

function motor(p, st) {
  const on = st && st.level !== 'uit';
  const speed = !on ? 0 : st.level === 'zwak' ? 1.2 : st.level === 'fel' ? 0.5 : 0.28;
  const dir = st && st.current < 0 ? 'reverse' : 'normal';
  return `
    <path d="M-60 0 H-26" ${LEAD}/>
    <path d="M60 0 H26" ${LEAD}/>
    <rect x="-26" y="-14" width="52" height="34" rx="9" fill="#5C7CFA" stroke="#364FC7" stroke-width="2"/>
    <rect x="-26" y="-2" width="52" height="6" fill="#4263EB"/>
    <rect x="-3" y="-28" width="6" height="16" fill="#868E96"/>
    <g transform="translate(0 -30)">
      <g class="${on ? 'spin' : ''}" style="animation-duration:${speed}s;animation-direction:${dir}">
        <ellipse cx="0" cy="-12" rx="6" ry="13" fill="#20C997" stroke="#0CA678" stroke-width="1.5"/>
        <ellipse cx="0" cy="-12" rx="6" ry="13" fill="#20C997" stroke="#0CA678" stroke-width="1.5" transform="rotate(120)"/>
        <ellipse cx="0" cy="-12" rx="6" ry="13" fill="#20C997" stroke="#0CA678" stroke-width="1.5" transform="rotate(240)"/>
        <circle r="4" fill="#495057"/>
      </g>
    </g>`;
}

function switchPart(p) {
  const on = Boolean(p.on);
  return `
    <path d="M-60 0 H-30" ${LEAD}/>
    <path d="M60 0 H30" ${LEAD}/>
    <rect x="-44" y="6" width="88" height="14" rx="5" fill="#D9C2A0" stroke="#A68A64" stroke-width="2"/>
    <g transform="rotate(${on ? 0 : -32} -30 0)">
      <rect x="-32" y="-4" width="64" height="8" rx="4" fill="${on ? '#2F9E44' : '#E03131'}"/>
      <circle cx="30" cy="0" r="6" fill="${on ? '#2F9E44' : '#E03131'}"/>
    </g>
    <circle cx="-30" cy="0" r="6" fill="#ADB5BD" stroke="#495057" stroke-width="2"/>
    <circle cx="30" cy="0" r="5" fill="#ADB5BD" stroke="#495057" stroke-width="2"/>
    ${label(0, 32, on ? 'AAN' : 'UIT', p.rot, `part-tag ${on ? 'part-tag--on' : 'part-tag--off'}`)}`;
}

function button(p, st, ui) {
  const down = ui?.pressed;
  return `
    <path d="M-60 0 H-28" ${LEAD}/>
    <path d="M60 0 H28" ${LEAD}/>
    <rect x="-44" y="4" width="88" height="14" rx="5" fill="#CED4DA" stroke="#868E96" stroke-width="2"/>
    <rect x="-30" y="${down ? -5 : -14}" width="60" height="5" rx="2" fill="#868E96"/>
    <rect x="-18" y="${down ? -20 : -32}" width="36" height="16" rx="7" fill="${down ? '#C92A2A' : '#F03E3E'}" stroke="#A61E1E" stroke-width="2"/>
    <circle cx="-28" cy="0" r="5" fill="#ADB5BD" stroke="#495057" stroke-width="2"/>
    <circle cx="28" cy="0" r="5" fill="#ADB5BD" stroke="#495057" stroke-width="2"/>
    ${label(0, 30, down ? 'IN' : 'DUW', p.rot, `part-tag ${down ? 'part-tag--on' : ''}`)}`;
}

function resistor() {
  return `
    <path d="M-60 0 H-28 M28 0 H60" ${LEAD}/>
    <rect x="-28" y="-11" width="56" height="22" rx="10" fill="#E9D8A6" stroke="#B39B62" stroke-width="2"/>
    <rect x="-16" y="-11" width="5" height="22" fill="#8B4513"/>
    <rect x="-5" y="-11" width="5" height="22" fill="#111"/>
    <rect x="6" y="-11" width="5" height="22" fill="#E03131"/>
    <rect x="17" y="-11" width="3" height="22" fill="#D4A017"/>`;
}

const MATERIAL_ART = {
  munt: '<circle r="17" fill="#F2B705" stroke="#B8860B" stroke-width="2.5"/><circle r="11" fill="none" stroke="#B8860B" stroke-width="1.5"/>',
  paperclip: '<path d="M-22 4 H14 a7 7 0 0 0 0 -14 H-16 a5 5 0 0 0 0 10 H10" fill="none" stroke="#868E96" stroke-width="3.5" stroke-linecap="round"/>',
  potlood: '<path d="M-26 -6 H16 L26 0 L16 6 H-26 Z" fill="#FAB005" stroke="#E67700" stroke-width="1.5"/><path d="M16 -6 L26 0 L16 6 Z" fill="#F1D9B5"/><path d="M22 -2.4 L26 0 L22 2.4 Z" fill="#333"/><rect x="-30" y="-6" width="5" height="12" fill="#F783AC"/>',
  alufolie: '<path d="M-22 -12 L-8 -16 L6 -11 L22 -15 L24 10 L8 14 L-6 10 L-24 14 Z" fill="#DEE2E6" stroke="#868E96" stroke-width="1.5"/><path d="M-12 -8 L0 4 M8 -6 L14 6" stroke="#ADB5BD" stroke-width="1.5"/>',
  plastic: '<rect x="-22" y="-13" width="44" height="26" rx="5" fill="#4DABF7" stroke="#1971C2" stroke-width="2"/>',
  hout: '<rect x="-24" y="-12" width="48" height="24" rx="3" fill="#C08552" stroke="#8B5A2B" stroke-width="2"/><path d="M-18 -4 Q0 -8 18 -4 M-18 4 Q0 0 18 5" stroke="#8B5A2B" stroke-width="1.5" fill="none"/>',
  papier: '<path d="M-18 -16 H12 L20 -8 V16 H-18 Z" fill="#fff" stroke="#868E96" stroke-width="2"/><path d="M-12 -6 H12 M-12 1 H12 M-12 8 H6" stroke="#CED4DA" stroke-width="2"/>',
  rubber: '<rect x="-22" y="-11" width="44" height="22" rx="6" fill="#F783AC" stroke="#C2255C" stroke-width="2"/><rect x="6" y="-11" width="16" height="22" rx="6" fill="#4DABF7" stroke="#1971C2" stroke-width="2"/>',
};

function material(p) {
  // Crocodile clips grab the object from both sides.
  return `
    <path d="M-60 0 H-40 M60 0 H40" ${LEAD}/>
    ${MATERIAL_ART[p.variant] || ''}
    <path d="M-42 -7 L-26 -3 L-26 3 L-42 7 Z" fill="#E03131"/>
    <path d="M42 -7 L26 -3 L26 3 L42 7 Z" fill="#2B2F3A"/>`;
}

const DRAW = { battery, lamp, led, buzzer, motor, switch: switchPart, button, resistor, material };

/** Inner SVG markup for a part. */
export function drawPart(part, state, ui) {
  return (DRAW[part.type] || (() => ''))(part, state, ui);
}

/** Shared <defs> (glow gradients). Put once in every SVG that draws parts. */
export const DEFS = `
  <defs>
    <radialGradient id="glow-yellow"><stop offset="0" stop-color="#FFF3A0" stop-opacity="1"/><stop offset=".45" stop-color="#FFD43B" stop-opacity=".6"/><stop offset="1" stop-color="#FFD43B" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow-red"><stop offset="0" stop-color="#FFC9C9" stop-opacity="1"/><stop offset=".45" stop-color="#FF6B6B" stop-opacity=".55"/><stop offset="1" stop-color="#FF6B6B" stop-opacity="0"/></radialGradient>
  </defs>`;

/** A small standalone icon of a part (toolbox, lesson cards). */
export function partIcon(key, { on = false } = {}) {
  const [type, variant] = key.split(':');
  const part = { type, variant, rot: 0, on };
  const state = on ? { level: 'fel', current: 1 } : null;
  const vb = type === 'motor' ? '-66 -66 132 100' : '-66 -50 132 90';
  return `<svg class="part-icon" viewBox="${vb}" aria-hidden="true">${DEFS}${drawPart(part, state, {})}</svg>`;
}
