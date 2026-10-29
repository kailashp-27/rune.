import { useId } from 'react';

export function RuneMark() {
  return <svg viewBox="0 0 30 35" fill="none" aria-hidden="true"><path d="M6 31V4L24 14 6 23M6 15l18 16" stroke="currentColor" strokeWidth="3.7" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

/** Original vector illustrations: decorative previews, not rule diagrams. */
export function GameArt({ kind }: { kind: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`game-art art-${kind}`} viewBox="0 0 320 270" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`board${id}`} x1="40" y1="20" x2="270" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#608cf8" /><stop offset="1" stopColor="#385dc0" /></linearGradient>
      <linearGradient id={`gold${id}`}><stop stopColor="#ffe5a0" /><stop offset="1" stopColor="#ffb940" /></linearGradient>
      <linearGradient id={`pink${id}`}><stop stopColor="#e5a1ee" /><stop offset="1" stopColor="#aa63c2" /></linearGradient>
    </defs>
    {kind === 'connect' && <g transform="translate(0 1) rotate(-10 160 140)">
      <ellipse cx="159" cy="246" rx="124" ry="15" fill="#171d3344" />
      <rect x="33" y="37" width="257" height="201" rx="20" fill="#253c80" stroke="#202b48" strokeWidth="6" />
      <rect x="26" y="26" width="257" height="201" rx="20" fill={`url(#board${id})`} stroke="#26344f" strokeWidth="6" />
      {Array.from({ length: 42 }, (_, i) => {
        const gold = [14, 21, 28, 35, 37, 39, 41].includes(i);
        const pink = [22, 29, 30, 36, 38, 40].includes(i);
        return <circle key={i} cx={49 + (i % 7) * 35} cy={49 + Math.floor(i / 7) * 31} r="11.5" fill={gold ? `url(#gold${id})` : pink ? `url(#pink${id})` : '#243c78'} stroke={gold ? '#ffd877' : pink ? '#df9de8' : '#28457e'} strokeWidth="3" />;
      })}
      <circle cx="282" cy="12" r="16" fill={`url(#gold${id})`} stroke="#b67d29" strokeWidth="3" />
      <circle cx="26" cy="246" r="16" fill={`url(#pink${id})`} stroke="#824c9d" strokeWidth="3" />
    </g>}
    {kind === 'terraform' && <g>
      <ellipse cx="165" cy="236" rx="129" ry="19" fill="#415c3a22" />
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5), c = i % 5;
        const h = [10, 16, 10, 18, 12, 20, 30, 24, 22, 15, 18, 42, 58, 37, 23, 11, 23, 39, 30, 17, 8, 13, 18, 16, 9][i];
        const x = 160 + (c - r) * 27, y = 76 + (r + c) * 16 - h;
        return <g key={i}><path d={`M${x-26} ${y+16}l26 16 26-16v${h}l-26 16-26-16z`} fill="#658a4b" stroke="#50743f" strokeWidth="2" /><path d={`M${x} ${y}l26 16-26 16-26-16z`} fill={i % 3 === 0 ? '#b9d77a' : '#92ba63'} stroke="#72984d" strokeWidth="2" />{[7, 17].includes(i) && <g transform={`translate(${x} ${y+11})`}><ellipse cy="3" rx="10" ry="6" fill="#3b563b55" /><path d="M-9 0v-19a9 9 0 0 1 18 0V0z" fill={i === 7 ? '#ffe1a0' : '#bd8bd1'} stroke={i === 7 ? '#a78342' : '#79558d'} strokeWidth="2" /><circle cy="-22" r="7" fill={i === 7 ? '#ffe6b2' : '#e8bbef'} /></g>}</g>;
      })}
    </g>}
    {kind === 'tidal' && <g>
      <path d="M25 110L161 44l136 66-136 88z" fill="#e1f1ce" stroke="#337e91" strokeWidth="5" />
      {Array.from({ length: 5 }, (_, i) => <g key={i} stroke="#7eb0a3" strokeWidth="2"><path d={`M${25+i*27} ${110-i*13}l136 88`} /><path d={`M${25+i*27} ${110+i*18}l136-66`} /></g>)}
      <path d="M13 149q44-25 88 0t88 0 121 0v44q-44 25-88 0t-88 0-121 0z" fill="#319daf" fillOpacity=".9" />
      <path d="M13 149q44-25 88 0t88 0 121 0M20 171q44-25 88 0t88 0 103 0" stroke="#b5f5e9" strokeWidth="5" strokeLinecap="round" />
      {[['94', '100'], ['218', '104']].map(([x, y], i) => <g key={x} transform={`translate(${x} ${y})`}><ellipse cy="8" rx="15" ry="8" fill="#226a7c44" /><rect x="-12" y="-20" width="24" height="29" rx="9" fill={i ? '#f6be6a' : '#f3f1d9'} stroke="#477d80" strokeWidth="3" /><circle cy="-24" r="9" fill={i ? '#ffd388' : '#fffce7'} /></g>)}
    </g>}
    {kind === 'pulse' && <g stroke="#af78bf" strokeWidth="2">
      {[45, 78, 112].map(r => <circle key={r} cx="160" cy="139" r={r} strokeOpacity={r === 112 ? '.3' : '.6'} />)}
      <path d="M65 74l95 65 90-47M160 139l-70 74M160 139l96 66" strokeWidth="4" />
      {[[65, 74, 13], [250, 92, 15], [90, 213, 12], [256, 205, 11], [160, 139, 24]].map(([x, y, r]) => <g key={x}><circle cx={x} cy={y} r={r+9} fill="#b16ee422" stroke="none" /><circle cx={x} cy={y} r={r} fill="#df9cf2" stroke="#f5ceff" strokeWidth="4" /><circle cx={x-3} cy={y-4} r={r*.3} fill="#fff1ff" stroke="none" /></g>)}
      <path d="M275 31v17m-8-8h16M36 175v13m-6-7h12" stroke="#ffcf84" strokeWidth="3" strokeLinecap="round" />
    </g>}
    {(kind === 'fortress' || kind === 'mirror') && <g transform="translate(160 146) rotate(-13)">
      <path d="M-121-80H121V85H-121z" fill={kind === 'mirror' ? '#7977b1' : '#b36e55'} stroke={kind === 'mirror' ? '#6b659a' : '#9c5847'} strokeWidth="5" />
      {Array.from({ length: 25 }, (_, i) => <rect key={i} x={-116+i%5*47} y={-75+Math.floor(i/5)*31} width="43" height="28" rx="2" fill={kind === 'mirror' ? (i%2 ? '#ada8df' : '#d4cafa') : (i%2 ? '#efb774' : '#ffe3aa')} />)}
      {[[-70, -33], [70, -33], [0, 27], [-70, 58], [70, 58]].map(([x, y], i) => <g key={`${x}${y}`} transform={`translate(${x} ${y})`} opacity={kind === 'mirror' && i % 2 ? '.45' : '1'}><ellipse cy="4" rx="17" ry="7" fill="#312c4c44" /><path d="M-13 0l2-28h-4v-11h9v8h12v-8h9v11h-4l2 28z" fill={i%2 ? '#645683' : '#fff4d5'} stroke={i%2 ? '#473e63' : '#b7a886'} strokeWidth="3" strokeLinejoin="round" /></g>)}
      {kind === 'mirror' && <path d="M5-112v229" stroke="#fff4fd" strokeWidth="5" strokeDasharray="11 8" />}
    </g>}
  </svg>;
}

export function Opponent({ difficulty }: { difficulty: string }) {
  return <svg className={`opponent-face face-${difficulty.toLowerCase()}`} viewBox="0 0 150 150" aria-hidden="true">
    <path d="M36 44L22 17l38 15M113 44l15-27-38 15" fill="currentColor" stroke="#29292c" strokeWidth="9" strokeLinejoin="round" />
    <circle cx="75" cy="80" r="57" fill="currentColor" stroke="#29292c" strokeWidth="11" />
    {difficulty === 'Hard' ? <><path d="M40 66l22 9M109 66l-22 9" stroke="#29292c" strokeWidth="9" strokeLinecap="round" /><path d="M44 82q9 13 20 0M86 82q9 13 20 0" fill="#29292c" /><path d="M61 108q17 8 29-6" fill="none" stroke="#29292c" strokeWidth="7" strokeLinecap="round" /></> : <><ellipse cx="53" cy="77" rx="7" ry="10" fill="#29292c" /><ellipse cx="97" cy="77" rx="7" ry="10" fill="#29292c" /><path d={difficulty === 'Easy' ? 'M55 102q20 23 40 0' : 'M61 107q14 9 28 0'} fill="none" stroke="#29292c" strokeWidth="7" strokeLinecap="round" /><circle cx="38" cy="94" r="6" fill="#fff" opacity=".25" /><circle cx="112" cy="94" r="6" fill="#fff" opacity=".25" /></>}
  </svg>;
}
