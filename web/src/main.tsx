import {DifficultySlider} from './components/DifficultySlider';
import {StatisticsDialog} from './components/Statistics';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ChevronRight, CircleHelp, Info, Menu, Settings, Star, Vibrate, Volume2, VolumeX, Activity, ChartNoAxesColumnIncreasing, UsersRound } from 'lucide-react';
import { games, difficulties, readSaved, save, type Difficulty, type Game, type Mode } from './data';
import { GameArt, Opponent, RuneMark } from './components/GameArt';
import { Dialog } from './components/Dialog';
import { Tutorial } from './components/Tutorial';
import { GameScreen } from './components/GameScreen';
import {TerraformScreen} from './components/TerraformScreen';
import {TidalScreen} from './components/TidalScreen';
import {PulseScreen} from './components/PulseScreen';
import {FortressScreen} from './components/FortressScreen';
import {MirrorScreen} from './components/MirrorScreen';
import {TrainingProgress} from './components/TrainingProgress';
import { vibrate } from './haptics';
import './style.css';

type Overlay = 'help' | 'settings' | 'menu' | 'about' | 'preview' | 'training' | 'statistics' | null;
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

function App() {
  const [selected, setSelected] = useState<Game | null>(null);
  const [backgrounded,setBackgrounded]=useState(document.hidden);
  useEffect(()=>{const update=()=>setBackgrounded(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  const [playing, setPlaying] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => readSaved('difficulty', 'Medium', (v): v is Difficulty => difficulties.includes(v as Difficulty)));
  const [mode, setMode] = useState<Mode>('human');
  const [muted, setMuted] = useState(() => readSaved('muted', true, isBoolean));
  const [vibration, setVibration] = useState(() => readSaved('vibration', false, isBoolean));
  const [showSearch, setShowSearch] = useState(() => readSaved('showSearch', false, isBoolean));
  const [favorites, setFavorites] = useState<string[]>(() => readSaved('favorites', [], (v): v is string[] => Array.isArray(v) && v.every(id => games.some(g => g.id === id))));
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [matchId, setMatchId] = useState(0);

  useEffect(() => { save('muted', muted); }, [muted]);
  useEffect(() => { save('vibration', vibration); }, [vibration]);
  useEffect(() => { save('difficulty', difficulty); }, [difficulty]);
  useEffect(() => { save('favorites', favorites); }, [favorites]);
  useEffect(() => { save('showSearch', showSearch); }, [showSearch]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [selected, playing, onlyFavorites]);

  function goHome() { setSelected(null); setPlaying(false); setOverlay(null); }
  function back() { if (playing) setPlaying(false); else goHome(); }
  function start() {
    setMatchId(id => id + 1); setPlaying(true);
    if (!readSaved(`tutorialSeen.${selected?.id==='tidal'?'tidal-v0.2':selected?.id==='mirror'?'mirror-v0.2':selected?.id}`, selected?.id==='connect'&&readSaved('tutorialSeen',false,isBoolean), isBoolean)) setOverlay('help');
  }
  function closeHelp() { save(`tutorialSeen.${selected?.id==='tidal'?'tidal-v0.2':selected?.id==='mirror'?'mirror-v0.2':selected?.id}`, true); setOverlay(null); }
  function toggleFavorite(id: string) { setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); }

  return <div className={`app ${selected ? 'in-game' : 'at-home'}`}>
    <header className="app-header">
      <div className="header-inner">
        <button className="round-button" onClick={() => selected ? back() : setOverlay('menu')} aria-label={selected ? playing ? 'Back to game setup' : 'Back to games' : 'Open menu'}>{selected ? <ArrowLeft strokeWidth={4} /> : <Menu strokeWidth={3} />}</button>
        {selected ? <h1>{selected.name}</h1> : <a className="wordmark" href="#" onClick={e => { e.preventDefault(); goHome(); }} aria-label="Rune home"><RuneMark /><span>rune</span><span className="brand-dot">✦</span></a>}
        {selected ? <button className="round-button" onClick={() => setOverlay('menu')} aria-label="Open menu"><Menu strokeWidth={3} /></button> : <span className="header-spacer" aria-hidden="true" />}
      </div>
    </header>

    <main>
      {!selected ? <section className="collection" aria-labelledby="collection-title">
        <div className="collection-heading"><div><p className="eyebrow">A LITTLE STRATEGY. A LOT OF PLAY.</p><h1 id="collection-title">{onlyFavorites ? 'Your favourites' : 'Pick your next move.'}</h1></div><button className={`favorites-filter ${onlyFavorites ? 'is-on' : ''}`} onClick={() => setOnlyFavorites(value => !value)} aria-label={onlyFavorites ? 'Show all games' : 'Show favourite games'} aria-pressed={onlyFavorites}><Star fill={onlyFavorites ? 'currentColor' : 'none'} size={19} /></button></div>
        <div className="game-grid">{games.filter(game => !onlyFavorites || favorites.includes(game.id)).sort((a,b)=>Number(favorites.includes(b.id))-Number(favorites.includes(a.id))).map(game => <article className={`game-card card-${game.id}`} key={game.id} style={{ '--card-bg': game.background, '--card-accent': game.accent } as React.CSSProperties}>
          <button className="game-card-open" onClick={() => { setSelected(game); setPlaying(false); }} aria-label={`Open ${game.name}${game.playable ? '' : ' preview'}`}><h2>{game.name}</h2><span className="card-underline" /><GameArt kind={game.id} /><span className={`card-status ${game.playable ? 'ready' : ''}`}>{game.playable ? 'PLAY NOW' : 'COMING SOON'}{game.playable && <ChevronRight size={15} strokeWidth={4} />}</span></button>
          <button className={`favorite-button ${favorites.includes(game.id) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(game.id)} aria-label={`${favorites.includes(game.id) ? 'Remove' : 'Add'} ${game.name} ${favorites.includes(game.id) ? 'from' : 'to'} favourites`} aria-pressed={favorites.includes(game.id)}><Star size={22} fill="currentColor" strokeWidth={1.8} /></button>
        </article>)}</div>
        {onlyFavorites && !favorites.length && <div className="empty-state"><Star size={46} /><h2>Your favourites live here.</h2><p>Tap a star on a game to save it.</p><button className="chunky purple-button" onClick={() => setOnlyFavorites(false)}>ALL GAMES</button></div>}
        <p className="home-footer"><RuneMark /> A little strategy. A lot of possibility.</p>
      </section> : playing ? (selected.id==='mirror'? <MirrorScreen key={'mirror-v0.2-' + matchId + mode} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} /> : selected.id==='fortress'? <FortressScreen key={'fortress-v0.1-' + matchId + mode} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} /> : selected.id==='pulse'? <PulseScreen key={'pulse-v0.1-' + matchId + mode} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} /> : selected.id==='tidal'? <TidalScreen key={'tidal-v0.2-' + matchId + mode} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} /> : selected.id==='terraform'? <TerraformScreen key={String(matchId) + mode} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} /> : <GameScreen key={`${matchId}-${mode}`} difficulty={difficulty} mode={mode} muted={muted} vibration={vibration} paused={overlay !== null || backgrounded} showSearch={showSearch} onBack={goHome} />) : <section className={`setup-screen setup-${selected.id}`}>
        <div className="setup-preview" style={{ '--card-bg': selected.background } as React.CSSProperties}><GameArt kind={selected.id} />{(selected.id === 'terraform' || selected.id === 'tidal' || selected.id === 'pulse' || selected.id === 'fortress' || selected.id === 'mirror') && <span className="alpha-rules-tag">ALPHA RULES</span>}<span className="preview-spark spark-one">✦</span><span className="preview-spark spark-two">✦</span></div>
        <p className="setup-tagline">{selected.tagline}</p>
        {selected.playable ? <>
          {mode==='human'?<div className={`difficulty-picker difficulty-${difficulty.toLowerCase()}`}><Opponent difficulty={difficulty} /><h2>{difficulty}</h2><DifficultySlider value={difficulty} onChange={setDifficulty}/></div>:<div className="friend-setup"><UsersRound size={64}/><h2>GOLD & PURPLE</h2><p>Take turns on this device.<br/>Gold goes first. Pass it to Purple next.</p></div>}
          <div className="mode-picker" aria-label="Play mode"><button className={mode === 'human' ? 'selected' : ''} aria-pressed={mode === 'human'} onClick={() => setMode('human')}>You vs Rune</button><button className={mode === 'friend' ? 'selected' : ''} aria-pressed={mode === 'friend'} onClick={() => setMode('friend')}>Play vs. Friend</button></div>
          <div className="setup-actions"><button className="chunky coral-button play-button" onClick={start}>PLAY</button><button className="chunky purple-button square" onClick={() => setOverlay('help')} aria-label="How to play"><span className="question-mark">?</span></button></div>
          <button className="text-button statistics-link" onClick={()=>setOverlay('statistics')}><ChartNoAxesColumnIncreasing size={21}/>Statistics</button>
        </> : <div className="coming-soon"><span className="coming-symbol">✦</span><h2>TAKING SHAPE</h2><p>This game is in development.</p><div className="setup-actions"><button className="chunky coral-button play-button" disabled>COMING SOON</button><button className="chunky purple-button square" onClick={() => setOverlay('preview')} aria-label={`About ${selected.name}`}><Info /></button></div><button className="text-button" onClick={() => { setSelected(games[0]); setPlaying(false); }}>Try Connect Four <ChevronRight size={17} /></button></div>}
      </section>}
    </main>

    {overlay === 'training' && <TrainingProgress onClose={() => setOverlay('menu')}/>}
    {overlay === 'statistics' && selected && <StatisticsDialog game={selected} initialMode={mode} onClose={()=>setOverlay(null)}/>}
    {overlay === 'help' && <Tutorial key={selected?.id} game={selected?.id} mode={mode} onClose={closeHelp} />}
    {overlay === 'settings' && <Dialog title="Settings" onClose={() => setOverlay('menu')} className="settings-dialog full-page-dialog">
      <div className="settings-row"><span>{muted ? <VolumeX /> : <Volume2 />}Sound</span><button role="switch" aria-checked={!muted} aria-label="Game sound" className={`toggle ${!muted ? 'on' : ''}`} onClick={() => setMuted(value => !value)}><span /></button></div>
      <div className="settings-row"><span><Vibrate />Vibration</span><button role="switch" aria-checked={vibration} aria-label="Vibration" className={`toggle ${vibration ? 'on' : ''}`} onClick={() => { const next = !vibration; setVibration(next); vibrate(next); }}><span /></button></div>
      <div className="settings-row"><span>Show search details</span><button role="switch" aria-checked={showSearch} aria-label="Show search details" className={`toggle ${showSearch ? 'on' : ''}`} onClick={() => setShowSearch(value => !value)}><span /></button></div>
      {selected?.playable && <button className="settings-link" onClick={() => setOverlay('help')}><CircleHelp size={22} />How to play<ChevronRight size={20} /></button>}
      <button className="settings-link" onClick={() => setOverlay('training')}><Activity size={22}/>Rune’s training<ChevronRight size={20}/></button>
      <button className="settings-link" onClick={() => setOverlay('about')}><Info size={22} />About Rune<ChevronRight size={20} /></button>
      <button className="chunky purple-button wide" onClick={() => setOverlay('menu')}>DONE</button>
    </Dialog>}
    {overlay === 'menu' && <Dialog title="Menu" onClose={() => setOverlay(null)} className="full-page-dialog menu-page">
      <div className="menu-brand"><RuneMark /><span>rune</span></div>
      <button className="settings-link" onClick={() => { setOnlyFavorites(false); goHome(); }}>All games<ChevronRight size={20} /></button>
      <button className="settings-link" onClick={() => setOverlay('settings')}><Settings size={22} />Settings<ChevronRight size={20} /></button>
      {selected?.playable&&<button className="settings-link" onClick={()=>setOverlay('statistics')}><ChartNoAxesColumnIncreasing size={22}/>Statistics<ChevronRight size={20}/></button>}
      <button className="settings-link" onClick={() => setOverlay('training')}><Activity size={22}/>Rune’s training<ChevronRight size={20}/></button>
      <button className="settings-link" onClick={() => setOverlay('about')}><Info size={22} />About Rune<ChevronRight size={20} /></button>
    </Dialog>}
    {overlay === 'about' && <Dialog title="A little about Rune" onClose={() => setOverlay(null)}><div className="about-mark"><RuneMark /></div><p className="dialog-copy">Small boards. Big possibilities. A collection of strategy games for curious minds.</p><p className="about-detail">Six playable strategy games, with distinct AI opponents and a step-by-step guide for each. See Rune’s training for the measured checkpoint history.</p><button className="chunky purple-button wide" onClick={() => setOverlay(null)}>GOT IT</button></Dialog>}
    {overlay === 'preview' && selected && <Dialog title={selected.name} onClose={() => setOverlay(null)}><p className="dialog-copy">This world is still taking shape. The game and its step-by-step guide will arrive together.</p><button className="chunky purple-button wide" onClick={() => setOverlay(null)}>GOT IT</button></Dialog>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
