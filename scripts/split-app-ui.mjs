/**
 * Moves UI from src/App.jsx into modular structure (movement only).
 * Run: node scripts/split-app-ui.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'src/App.jsx');
const src = fs.readFileSync(APP, 'utf8');
const lines = src.split('\n');

const mkdir = (p) => fs.mkdirSync(p, { recursive: true });

function lineStarts(name) {
  return lines.findIndex((l) => l.startsWith(`const ${name}=`));
}

function extractArrowFn(name) {
  const idx = lineStarts(name);
  if (idx === -1) throw new Error(`missing ${name}`);
  return lines[idx].replace(new RegExp(`^const ${name}=`), '');
}

function extractComponent(name) {
  const idx = lineStarts(name);
  if (idx === -1) throw new Error(`missing component ${name}`);
  let endIdx = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('/* ═══') || lines[i].startsWith('export default')) {
      endIdx = i;
      break;
    }
  }
  const joined = lines.slice(idx, endIdx).join('\n');
  return joined.replace(new RegExp(`^const ${name}=`), '').trim();
}

// ── directories ──
[
  'src/ui/atoms',
  'src/ui/molecules',
  'src/ui/organisms',
  'src/data/mocks',
  'src/features/home',
  'src/features/roster',
  'src/features/schedule',
  'src/features/content',
  'src/features/chat',
  'src/features/more',
  'src/features/onboarding',
  'src/app',
  'src/assets/images',
].forEach((d) => mkdir(path.join(ROOT, d)));

// ── tokens ──
const ffLine = lines.find((l) => l.startsWith('const ff='));
const dataLine = lines.find((l) => l.startsWith('const tC='));

fs.writeFileSync(
  path.join(ROOT, 'src/ui/tokens.js'),
  `export const C = ${extractArrowFn('C')}
export const ff = ${ffLine.match(/ff=([^,]+)/)[1]};
export const fd = ${ffLine.match(/fd=([^;]+)/)[1]};
${dataLine.replace(/^const /, 'export const ')}
`,
);

// ── assets ──
fs.writeFileSync(
  path.join(ROOT, 'src/assets/images/index.js'),
  `import PI from './player.jpg';
import CI from './coach.jpg';
import BC from './court.jpg';
import BP from './practice.jpg';
import BD from './banner.jpg';

export { PI, CI, BC, BP, BD };
`,
);

// ── atoms ──
fs.writeFileSync(
  path.join(ROOT, 'src/ui/atoms/Icon.jsx'),
  `import { C } from '../tokens.js';

export const I = ${extractArrowFn('I')}
export default I;
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/ui/atoms/Pill.jsx'),
  `export const Pill = ${extractArrowFn('Pill')}
export default Pill;
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/ui/atoms/Button.jsx'),
  `import { C, fd } from '../tokens.js';

export const Btn = ${extractArrowFn('Btn')}
export default Btn;
`,
);

// ── molecules ──
fs.writeFileSync(
  path.join(ROOT, 'src/ui/molecules/Avatar.jsx'),
  `import { C, fd } from '../tokens.js';

const IA = ${extractArrowFn('IA')}

export const Av = ${extractArrowFn('Av')}
export default Av;
`,
);

const moleculeFiles = [
  ['Card.jsx', 'Cd', "import { C } from '../tokens.js';\n\nexport const Cd = "],
  ['SectionHeader.jsx', 'SH', "import { C, ff, fd } from '../tokens.js';\n\nexport const SH = "],
  ['ProgressBar.jsx', 'PB', "import { C } from '../tokens.js';\n\nexport const PB = "],
  ['RingGauge.jsx', 'Rg', "import { C, fd } from '../tokens.js';\n\nexport const Rg = "],
  ['Sparkline.jsx', 'Sp', "import { C } from '../tokens.js';\n\nexport const Sp = "],
  [
    'BackButton.jsx',
    'Bk',
    "import { ff } from '../tokens.js';\nimport { I } from '../atoms/Icon.jsx';\n\nexport const Bk = ",
  ],
];

for (const [file, name, header] of moleculeFiles) {
  fs.writeFileSync(
    path.join(ROOT, `src/ui/molecules/${file}`),
    `${header}${extractArrowFn(name)}
export default ${name};
`,
  );
}

// ── organisms ──
fs.writeFileSync(
  path.join(ROOT, 'src/ui/organisms/Hero.jsx'),
  `export const Hero = ${extractArrowFn('Hero')}
export default Hero;
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/ui/organisms/Strip.jsx'),
  `import { I } from '../atoms/Icon.jsx';

export const Strip = ${extractArrowFn('Strip')}
export default Strip;
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/ui/organisms/ScreenLayout.jsx'),
  `export function ScreenLayout({ children, sx = {} }) {
  return (
    <div style={{ padding: '0 0 110px', animation: 'fu .3s ease', ...sx }}>
      {children}
    </div>
  );
}
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/ui/index.js'),
  `export { C, ff, fd, tC, sC, sL, skC } from './tokens.js';
export { I } from './atoms/Icon.jsx';
export { Pill } from './atoms/Pill.jsx';
export { Btn } from './atoms/Button.jsx';
export { Cd } from './molecules/Card.jsx';
export { Av } from './molecules/Avatar.jsx';
export { SH } from './molecules/SectionHeader.jsx';
export { PB } from './molecules/ProgressBar.jsx';
export { Rg } from './molecules/RingGauge.jsx';
export { Sp } from './molecules/Sparkline.jsx';
export { Bk } from './molecules/BackButton.jsx';
export { Hero } from './organisms/Hero.jsx';
export { Strip } from './organisms/Strip.jsx';
export { ScreenLayout } from './organisms/ScreenLayout.jsx';
`,
);

// ── mocks ──
const plStart = lines.findIndex((l) => l.startsWith('const PL='));
const plEnd = lines.findIndex((l, i) => i > plStart && l.startsWith('];')) + 1;

fs.writeFileSync(
  path.join(ROOT, 'src/data/mocks/players.js'),
  `import { PI } from '../../assets/images/index.js';

${lines.slice(plStart, plEnd).join('\n').replace(/^const PL=/, 'export const PL =')}
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/data/mocks/team.js'),
  `${lines[39].replace(/^const tG=/, 'export const tG =')}\n`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/data/mocks/schedule.js'),
  `${lines[40].replace(/^const sch=/, 'export const sch =')}\n`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/data/mocks/chat.js'),
  `import { PI } from '../../assets/images/index.js';

${lines[41].replace(/^const chL=/, 'export const chL =')}
${lines[44].replace(/^const dms=/, 'export const dms =')}
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/data/mocks/content.js'),
  `${lines[42].replace(/^const mkt=/, 'export const mkt =')}
${lines[43].replace(/^const cLb=/, 'export const cLb =')}
`,
);

// ── features ──
const uiImport = `import {
  C, ff, fd, tC, sC, sL, skC,
  I, Pill, Btn, Cd, Av, SH, PB, Rg, Sp, Bk, Hero, Strip,
} from '../../ui/index.js';
`;

function writeFeature(file, exportName, constName, extraImports, transformBody) {
  let body = extractComponent(constName);
  if (transformBody) body = transformBody(body);
  const needsReact = /useState|useEffect|useRef/.test(body);
  const reactImport = needsReact ? "import { useState, useEffect, useRef } from 'react';\n" : '';

  fs.writeFileSync(
    path.join(ROOT, 'src/features', file),
    `${reactImport}${extraImports}${uiImport}
const ${exportName} = ${body};

export default ${exportName};
`,
  );
}

writeFeature(
  'roster/PlayerProfileScreen.jsx',
  'PlayerProfileScreen',
  'Prof',
  `import { mkt } from '../../data/mocks/content.js';\nimport { BD } from '../../assets/images/index.js';\n`,
);

writeFeature(
  'home/HomeScreen.jsx',
  'HomeScreen',
  'Home',
  `import { PI, CI, BC, BP, BD } from '../../assets/images/index.js';
import { PL } from '../../data/mocks/players.js';
import { tG } from '../../data/mocks/team.js';
import { sch } from '../../data/mocks/schedule.js';
`,
);

writeFeature(
  'roster/RosterScreen.jsx',
  'RosterScreen',
  'Roster',
  `import { BD } from '../../assets/images/index.js';
import { PL } from '../../data/mocks/players.js';
import PlayerProfileScreen from './PlayerProfileScreen.jsx';
`,
  (body) => body.replace(/<Prof /g, '<PlayerProfileScreen '),
);

writeFeature(
  'schedule/ScheduleScreen.jsx',
  'ScheduleScreen',
  'SchedTab',
  `import { BP } from '../../assets/images/index.js';
import { sch } from '../../data/mocks/schedule.js';
`,
);

writeFeature(
  'content/ContentScreen.jsx',
  'ContentScreen',
  'ContTab',
  `import { BC } from '../../assets/images/index.js';
import { cLb, mkt } from '../../data/mocks/content.js';
`,
);

writeFeature(
  'chat/ChatScreen.jsx',
  'ChatScreen',
  'ChatTab',
  `import { BP } from '../../assets/images/index.js';
import { chL, dms } from '../../data/mocks/chat.js';
`,
);

writeFeature(
  'more/MoreScreen.jsx',
  'MoreScreen',
  'MoreTab',
  `import { CI, BC } from '../../assets/images/index.js';
`,
);

writeFeature(
  'onboarding/OnboardingScreen.jsx',
  'OnboardingScreen',
  'Onboard',
  `import { BC } from '../../assets/images/index.js';
`,
);

// ── app shell ──
fs.writeFileSync(
  path.join(ROOT, 'src/app/GlobalStyles.jsx'),
  `import { C } from '../ui/tokens.js';

export default function GlobalStyles() {
  return (
    <style>{\`*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}body{background:\${C.bg};}@keyframes fu{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}input::placeholder{color:\${C.dim};}::-webkit-scrollbar{display:none;}.tab-bar{padding:6px 4px max(28px,calc(env(safe-area-inset-bottom) + 6px)) !important;}\`}</style>
  );
}
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/app/TabBar.jsx'),
  `import { C, ff, I } from '../ui/index.js';

export default function TabBar({ tabs, tab, setTab }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: 'rgba(12,12,16,.92)',
        backdropFilter: 'blur(20px)',
        borderTop: \`1px solid \${C.ln}\`,
        display: 'flex',
        padding: '6px 4px 28px',
        zIndex: 100,
      }}
      className="tab-bar"
    >
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => setTab(i)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            minHeight: 48,
          }}
        >
          {tab === i && (
            <div style={{ position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2, background: C.br }} />
          )}
          <I n={t.i} s={22} c={tab === i ? C.br : C.dim} />
          <span style={{ fontSize: 10, color: tab === i ? C.br : C.dim, fontWeight: tab === i ? 700 : 500, fontFamily: ff }}>
            {t.l}
          </span>
          {t.l === 'Chat' && (
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: '50%',
                marginRight: -15,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: C.br,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
`,
);

fs.writeFileSync(
  path.join(ROOT, 'src/app/App.jsx'),
  `import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { C, ff } from '../ui/tokens.js';
import GlobalStyles from './GlobalStyles.jsx';
import TabBar from './TabBar.jsx';
import HomeScreen from '../features/home/HomeScreen.jsx';
import RosterScreen from '../features/roster/RosterScreen.jsx';
import ScheduleScreen from '../features/schedule/ScheduleScreen.jsx';
import ContentScreen from '../features/content/ContentScreen.jsx';
import ChatScreen from '../features/chat/ChatScreen.jsx';
import MoreScreen from '../features/more/MoreScreen.jsx';
import OnboardingScreen from '../features/onboarding/OnboardingScreen.jsx';

export default function App() {
  const [scr, setScr] = useState('ob');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0C0C10' }).catch(() => {});
    }
  }, []);

  const tabs = [
    { l: 'Home', i: 'home' },
    { l: 'Roster', i: 'users' },
    { l: 'Schedule', i: 'cal' },
    { l: 'Content', i: 'book' },
    { l: 'Chat', i: 'chat' },
    { l: 'More', i: 'grid' },
  ];

  const views = [
    <HomeScreen key="h" go={setTab} />,
    <RosterScreen key="r" />,
    <ScheduleScreen key="s" />,
    <ContentScreen key="c" />,
    <ChatScreen key="ch" />,
    <MoreScreen key="m" />,
  ];

  return (
    <>
      <GlobalStyles />
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: ff, position: 'relative' }}>
        {scr === 'ob' ? (
          <OnboardingScreen done={() => setScr('app')} />
        ) : (
          <>
            <div style={{ overflowY: 'auto', height: '100vh' }}>{views[tab]}</div>
            <TabBar tabs={tabs} tab={tab} setTab={setTab} />
          </>
        )}
      </div>
    </>
  );
}
`,
);

fs.writeFileSync(path.join(ROOT, 'src/App.jsx'), `export { default } from './app/App.jsx';\n`);

console.log('UI split complete.');
