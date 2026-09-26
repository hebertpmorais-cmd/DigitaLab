'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const TEXTS = [
  'A prática constante transforma precisão em velocidade. Mantenha os olhos na tela e deixe os dedos encontrarem as teclas com naturalidade.',
  'Digitar bem não significa apenas correr. Primeiro construa precisão, depois aumente o ritmo sem perder o controle das mãos.',
  'Tecnologia, estudo e trabalho ficam mais fluidos quando a digitação deixa de exigir esforço consciente e passa a acontecer por memória muscular.',
  'Pequenas sessões todos os dias costumam funcionar melhor do que um treino longo e cansativo. Regularidade é parte importante da evolução.',
  'Posicione os indicadores sobre F e J, relaxe os ombros e mantenha os punhos neutros enquanto percorre o teclado sem olhar para as mãos.'
]

const LESSONS = [
  { title: 'Linha base', keys: 'asdf jklç', text: 'asdf jklç asdf jklç fj fj dk dk sl sl aç aç' },
  { title: 'Linha superior', keys: 'qwerty uiop', text: 'queiro teto tipo pior quero perto toque equipe roteiro' },
  { title: 'Linha inferior', keys: 'zxcvb nm', text: 'zona caixa vivo banco nome cinema vinho combo' },
  { title: 'Palavras', keys: 'alfabeto completo', text: 'trabalho estudo foco teclado prática ritmo precisão velocidade' },
]

const HAND_GROUPS = [
  { finger: 'Mindinho E', keys: 'Q A Z' }, { finger: 'Anelar E', keys: 'W S X' },
  { finger: 'Médio E', keys: 'E D C' }, { finger: 'Indicador E', keys: 'R F V • T G B' },
  { finger: 'Indicador D', keys: 'Y H N • U J M' }, { finger: 'Médio D', keys: 'I K ,' },
  { finger: 'Anelar D', keys: 'O L .' }, { finger: 'Mindinho D', keys: 'P Ç ; /' },
]

const randomText = () => TEXTS[Math.floor(Math.random() * TEXTS.length)]

const FINGER_MAP = {
  q:'Mindinho E', a:'Mindinho E', z:'Mindinho E',
  w:'Anelar E', s:'Anelar E', x:'Anelar E',
  e:'Médio E', d:'Médio E', c:'Médio E',
  r:'Indicador E', f:'Indicador E', v:'Indicador E', t:'Indicador E', g:'Indicador E', b:'Indicador E',
  y:'Indicador D', h:'Indicador D', n:'Indicador D', u:'Indicador D', j:'Indicador D', m:'Indicador D',
  i:'Médio D', k:'Médio D', ',':'Médio D',
  o:'Anelar D', l:'Anelar D', '.':'Anelar D',
  p:'Mindinho D', 'ç':'Mindinho D', ';':'Mindinho D', '/':'Mindinho D'
}

const HUNT_WORDS = [
  'rato','turbo','teclado','velocidade','ritmo','prática','precisão','corrida',
  'dedos','texto','tempo','controle','memória','digitação','trabalho','estudo',
  'foco','melhorar','palavra','rápido','linha','base','toque','movimento',
  'resultado','treino','erro','acerto','pista','técnica','natural','olhos'
]

function normalizeKey(char) {
  return char?.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''
}

function fingerForKey(char) {
  const raw = char?.toLocaleLowerCase('pt-BR') || ''
  return FINGER_MAP[raw] || FINGER_MAP[normalizeKey(raw)] || 'Outro'
}

function buildHuntText(keys) {
  const normalized = keys.map(k => normalizeKey(k)).filter(Boolean)
  if (!normalized.length) return TEXTS[0]
  const scored = HUNT_WORDS
    .map(word => ({
      word,
      score: normalized.reduce((total, key) => total + [...normalizeKey(word)].filter(c => c === key).length, 0)
    }))
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,12)
    .map(item => item.word)

  const warmup = normalized.flatMap(key => [key,key,key]).join(' ')
  const pairs = normalized.flatMap((key,i) => normalized.filter((_,j) => j !== i).map(other => key + other)).slice(0,12).join(' ')
  const words = scored.length ? scored.join(' ') : normalized.join(' ')
  return `${warmup} ${pairs} ${words} ${words}`.trim()
}

function calcStats(input, text, secondsElapsed, attempts = 0, mistakes = 0) {
  const minutes = Math.max(secondsElapsed / 60, 1 / 60)
  const totalAttempts = attempts || input.length
  const correctAttempts = Math.max(0, totalAttempts - mistakes)

  return {
    typed: totalAttempts,
    correct: correctAttempts,
    errors: mistakes,
    wpm: Math.round((correctAttempts / 5) / minutes),
    cpm: Math.round(correctAttempts / minutes),
    accuracy: totalAttempts
      ? Math.max(0, Math.round((correctAttempts / totalAttempts) * 1000) / 10)
      : 100
  }
}

function CharacterText({ text, input }) {
  return <div className="typing-copy">{text.split('').map((char, index) => {
    let cls = 'char'
    if (index < input.length) cls += input[index] === char ? ' correct' : ' wrong'
    else if (index === input.length) cls += ' current'
    return <span className={cls} key={index}>{char}</span>
  })}</div>
}

function Stat({ label, value, suffix = '' }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}{suffix}</strong></div>
}

function MetricsHelp() {
  return <div className="metrics-help">
    <button className="metrics-help-trigger" type="button" aria-label="Explicação das medidas">?</button>
    <div className="metrics-help-popover">
      <div className="metrics-help-title">
        <b>O que significam essas medidas?</b>
        <small>Passei as siglas para português para ficar mais fácil de entender.</small>
      </div>
      <div className="metrics-help-grid">
        <div><strong>PPM</strong><span>Palavras por minuto. É a velocidade aproximada da sua digitação.</span></div>
        <div><strong>CPM</strong><span>Caracteres por minuto. Conta letras, espaços e outros caracteres digitados corretamente.</span></div>
        <div><strong>Precisão</strong><span>Porcentagem de tentativas corretas. Erros apagados e corrigidos continuam entrando no cálculo.</span></div>
        <div><strong>Erros</strong><span>Total de caracteres digitados errado durante a corrida, inclusive os que você apagou e corrigiu depois.</span></div>
      </div>
    </div>
  </div>
}

function AuthBox({ user, onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin }
        })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) {
      setMessage('Cadastro criado. Confira seu e-mail para confirmar a conta.')
    } else {
      onClose()
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    onClose()
  }

  return <div className="auth-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="auth-card">
      <button className="auth-close" onClick={onClose}>×</button>
      {user ? <>
        <p className="eyebrow">MINHA CONTA</p>
        <h2>Você está conectado</h2>
        <p className="muted">{user.email}</p>
        <button className="primary-btn" onClick={logout}>Sair da conta</button>
      </> : <>
        <p className="eyebrow">{mode === 'login' ? 'ENTRAR NA TOCA' : 'CRIAR SUA TOCA'}</p>
        <h2>{mode === 'login' ? 'Volte para a pista' : 'Guarde seu rastro'}</h2>
        <form className="auth-form" onSubmit={submit}>
          <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Senha<input type="password" minLength="6" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {message && <p className="auth-message">{message}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
          {mode === 'login' ? 'Quero criar minha toca' : 'Já tenho uma toca'}
        </button>
      </>}
    </div>
  </div>
}

function Trainer({ user, onSaved, initialText }) {
  const [duration, setDuration] = useState(30)
  const [text, setText] = useState(initialText || TEXTS[0])
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [errorEvents, setErrorEvents] = useState([])
  const inputRef = useRef(null)
  const elapsed = duration - timeLeft
  const stats = useMemo(
    () => calcStats(input, text, elapsed, attempts, errorEvents.length),
    [input, text, elapsed, attempts, errorEvents.length]
  )

  useEffect(() => {
    if (initialText) {
      setText(initialText)
      setInput('')
      setTimeLeft(duration)
      setStarted(false)
      setFinished(false)
      setSaved(false)
      setAttempts(0)
      setErrorEvents([])
    }
  }, [initialText])

  useEffect(() => {
    if (!started || finished) return
    if (timeLeft <= 0) { setFinished(true); setStarted(false); return }
    const timer = setTimeout(() => setTimeLeft(v => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [started, finished, timeLeft])

  useEffect(() => {
    if (input.length >= text.length && started) { setFinished(true); setStarted(false) }
  }, [input, text, started])

  useEffect(() => {
    if (!finished || !user || saved || input.length === 0) return
    async function saveResult() {
      setSaved(true)
      const { data, error } = await supabase.from('typing_sessions').insert({
        user_id: user.id,
        duration_seconds: Math.max(1, elapsed),
        mode: 'text',
        wpm: stats.wpm,
        cpm: stats.cpm,
        accuracy: stats.accuracy,
        errors: stats.errors,
        typed_chars: stats.typed,
        correct_chars: stats.correct
      }).select('id').single()

      if (!error && data && errorEvents.length > 0) {
        const rows = errorEvents.map(item => ({
          session_id: data.id,
          user_id: user.id,
          position: item.position,
          expected_char: item.expected,
          typed_char: item.typed
        }))
        await supabase.from('typing_errors').insert(rows)
      }
      if (!error) onSaved()
    }
    saveResult()
  }, [finished, user, saved, input, text, elapsed, stats, errorEvents, onSaved])

  function reset(nextDuration = duration, nextText = randomText()) {
    setDuration(nextDuration); setTimeLeft(nextDuration); setText(nextText); setInput('')
    setStarted(false); setFinished(false); setSaved(false); setAttempts(0); setErrorEvents([])
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function handleChange(e) {
    if (finished) return
    const value = e.target.value.slice(0, text.length)

    if (value.length > input.length) {
      let prefix = 0
      while (prefix < input.length && prefix < value.length && input[prefix] === value[prefix]) prefix++

      const addedCount = value.length - input.length
      const added = value.slice(prefix, prefix + addedCount)

      if (added.length) {
        setAttempts(total => total + added.length)

        const newErrors = []
        for (let offset = 0; offset < added.length; offset++) {
          const position = prefix + offset
          const typedChar = added[offset]
          const expectedChar = text[position] ?? ''

          if (typedChar !== expectedChar) {
            newErrors.push({
              position,
              expected: expectedChar,
              typed: typedChar
            })
          }
        }

        if (newErrors.length) {
          setErrorEvents(current => [...current, ...newErrors])
        }
      }
    }

    if (!started && value.length > 0) setStarted(true)
    setInput(value)
  }

  return <section className="panel trainer-panel">
    <div className="panel-head">
      <div><p className="eyebrow">PISTA DE DIGITAÇÃO</p><h2>Aqueça os dedos. Solte o turbo.</h2></div>
      <div className="duration-group">{[15,30,60].map(sec =>
        <button key={sec} className={duration === sec ? 'chip active' : 'chip'} onClick={() => reset(sec)}>{sec}s</button>
      )}</div>
    </div>
    {!user && <div className="save-hint">Corra livremente. Entre na sua toca para salvar o rastro e acompanhar sua evolução.</div>}
    <div className="dev-note">
      <b>Nota do projeto:</b>
      <span>Essa versão ainda está em desenvolvimento. Estou adicionando as funções por etapas e ajustando o que não ficar legal.</span>
    </div>
    <div className="stats-row">
      <Stat label="Tempo" value={timeLeft} suffix="s" /><Stat label="PPM" value={stats.wpm} />
      <Stat label="CPM" value={stats.cpm} /><Stat label="Precisão" value={stats.accuracy} suffix="%" /><Stat label="Erros" value={stats.errors} />
    </div>
    <MetricsHelp />
    <button className="typing-area" onClick={() => inputRef.current?.focus()} type="button">
      <CharacterText text={text} input={input} />
      <textarea ref={inputRef} className="hidden-input" value={input} onChange={handleChange}
        onPaste={e => e.preventDefault()} autoFocus spellCheck={false} aria-label="Campo de digitação" />
    </button>
    <div className="trainer-footer">
      <p>{started ? 'Turbo ligado — mantenha os olhos na tela.' : finished ? 'Corrida finalizada.' : 'Comece a digitar para largar.'}</p>
      <button className="secondary-btn" onClick={() => reset()}>Nova corrida</button>
    </div>
    {finished && <div className="result-box">
      <p className="eyebrow">CHEGADA {user && saved ? '• RASTRO SALVO' : ''}</p>
      <div className="result-main"><strong>{stats.wpm}</strong><span>PPM</span></div>
      <p>{stats.accuracy >= 97 ? 'Ótima precisão. Agora tente aumentar o ritmo gradualmente.' : stats.accuracy >= 93 ? 'Bom equilíbrio. Tente reduzir os erros antes de acelerar.' : 'Priorize a precisão no próximo treino e diminua um pouco o ritmo.'}</p>
      <button className="primary-btn" onClick={() => reset()}>Correr novamente</button>
    </div>}
  </section>
}

function Learn() {
  const [lesson, setLesson] = useState(0)
  return <section className="learn-grid">
    <div className="panel">
      <p className="eyebrow">POSICIONAMENTO DAS MÃOS</p><h2>Comece sempre pela linha base</h2>
      <p className="muted">No teclado ABNT2, use as saliências das teclas <b>F</b> e <b>J</b> para reencontrar a posição sem olhar.</p>
      <div className="home-row">{['A','S','D','F','J','K','L','Ç'].map((k,i) =>
        <div key={k} className={k === 'F' || k === 'J' ? 'key anchor' : 'key'}><b>{k}</b><small>{['ME','AE','MdE','IE','ID','MdD','AD','MD'][i]}</small></div>
      )}</div>
      <div className="finger-grid">{HAND_GROUPS.map(item => <div className="finger-card" key={item.finger}><span>{item.finger}</span><strong>{item.keys}</strong></div>)}</div>
      <div className="tip-box"><b>Postura:</b> ombros relaxados, cotovelos próximos de 90°, punhos neutros e polegares próximos à barra de espaço.</div>
    </div>
    <div className="panel">
      <p className="eyebrow">AULAS PRÁTICAS</p><h2>Treino progressivo</h2>
      <div className="lesson-list">{LESSONS.map((item,index) =>
        <button onClick={() => setLesson(index)} className={lesson === index ? 'lesson active' : 'lesson'} key={item.title}>
          <span>{index+1}</span><div><b>{item.title}</b><small>{item.keys}</small></div>
        </button>
      )}</div>
      <div className="practice-box"><span>Exercício sugerido</span><p>{LESSONS[lesson].text}</p></div>
      <div className="tips"><p><b>1.</b> Evite olhar para o teclado.</p><p><b>2.</b> Busque 97% ou mais de precisão.</p><p><b>3.</b> Faça sessões curtas e frequentes.</p></div>
    </div>
  </section>
}


function HuntMode({ user, onTrain }) {
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { setErrors([]); return }
    setLoading(true)
    supabase.from('typing_errors')
      .select('expected_char, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        const counts = {}
        for (const item of data || []) {
          const key = item.expected_char?.toLocaleLowerCase('pt-BR')
          if (!key || key === ' ') continue
          counts[key] = (counts[key] || 0) + 1
        }
        const ranked = Object.entries(counts)
          .map(([key,count]) => ({ key, count, finger: fingerForKey(key) }))
          .sort((a,b) => b.count - a.count)
        setErrors(ranked)
        setLoading(false)
      })
  }, [user])

  if (!user) return <section className="panel hunt-empty">
    <p className="eyebrow">MODO CAÇA</p>
    <h2>Primeiro preciso conhecer seus erros</h2>
    <p className="muted">Entre na sua toca e faça algumas corridas. O RatoTurbo vai usar esses resultados para descobrir quais teclas precisam de mais treino.</p>
  </section>

  if (loading) return <section className="panel"><p className="muted">Analisando seu rastro...</p></section>

  if (!errors.length) return <section className="panel hunt-empty">
    <p className="eyebrow">MODO CAÇA</p>
    <h2>Ainda não encontrei uma tecla problemática</h2>
    <p className="muted">Faça algumas corridas normalmente. Quando houver erros salvos, eles aparecem aqui.</p>
  </section>

  const topKeys = errors.slice(0,4)
  const fingerCounts = {}
  errors.forEach(item => { fingerCounts[item.finger] = (fingerCounts[item.finger] || 0) + item.count })
  const topFinger = Object.entries(fingerCounts).sort((a,b) => b[1] - a[1])[0]

  return <section className="hunt-stack">
    <div className="panel">
      <p className="eyebrow">MODO CAÇA</p>
      <h2>Encontrei onde você mais tropeça</h2>
      <p className="muted small-copy">Usei seus erros mais recentes para montar esse diagnóstico. Quanto mais você treinar, mais útil ele fica.</p>

      <div className="hunt-summary">
        <div className="hunt-main">
          <span>Tecla que mais escapou</span>
          <strong>{topKeys[0].key === ' ' ? 'Espaço' : topKeys[0].key.toUpperCase()}</strong>
          <small>{topKeys[0].count} erros encontrados</small>
        </div>
        <div className="hunt-main">
          <span>Dedo que mais precisa de treino</span>
          <strong className="hunt-finger">{topFinger?.[0]}</strong>
          <small>{topFinger?.[1]} erros ligados a esse dedo</small>
        </div>
      </div>

      <div className="hunt-keys">
        {topKeys.map((item,index) => <div className="hunt-key" key={item.key}>
          <span>#{index + 1}</span>
          <strong>{item.key.toUpperCase()}</strong>
          <div><b>{item.count} erros</b><small>{item.finger}</small></div>
        </div>)}
      </div>

      <button className="primary-btn hunt-start" onClick={() => onTrain(buildHuntText(topKeys.map(item => item.key)))}>
        Treinar essas teclas
      </button>
    </div>

    <div className="panel hunt-how">
      <p className="eyebrow">COMO FUNCIONA</p>
      <div className="hunt-steps">
        <div><span>1</span><p>Você faz corridas normalmente.</p></div>
        <div><span>2</span><p>Eu salvo as teclas que saíram erradas.</p></div>
        <div><span>3</span><p>O Modo Caça encontra os padrões e monta um treino focado.</p></div>
      </div>
    </div>
  </section>
}

function Dashboard({ user, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { setSessions([]); return }
    setLoading(true)
    supabase.from('typing_sessions').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [user, refreshKey])

  if (!user) return <section className="panel empty-state"><p className="eyebrow">ESTATÍSTICAS</p><h2>Entre para acompanhar sua evolução</h2><p className="muted">Seus resultados serão salvos por conta e protegidos pelo Supabase.</p></section>
  if (loading) return <section className="panel"><p className="muted">Carregando estatísticas...</p></section>

  const count = sessions.length
  const avgWpm = count ? Math.round(sessions.reduce((a,s) => a+s.wpm,0)/count) : 0
  const bestWpm = count ? Math.max(...sessions.map(s => s.wpm)) : 0
  const avgAcc = count ? (sessions.reduce((a,s) => a+Number(s.accuracy),0)/count).toFixed(1) : '0.0'
  const totalXp = sessions.reduce((total, s) => {
    const base = 20
    const precisionBonus = Number(s.accuracy) >= 97 ? 10 : Number(s.accuracy) >= 93 ? 5 : 0
    const speedBonus = Math.min(20, Math.floor(s.wpm / 10) * 2)
    return total + base + precisionBonus + speedBonus
  }, 0)
  const level = Math.floor(totalXp / 200) + 1
  const xpInLevel = totalXp % 200
  const achievements = [
    { title: 'Primeira corrida', done: count >= 1, note: 'Complete 1 corrida.' },
    { title: 'Pegando ritmo', done: count >= 10, note: 'Complete 10 corridas.' },
    { title: 'Precisão afiada', done: sessions.some(s => Number(s.accuracy) >= 98), note: 'Faça uma corrida com 98% ou mais de precisão.' },
    { title: 'Turbo ligado', done: sessions.some(s => s.wpm >= 60), note: 'Alcance 60 PPM em uma corrida.' }
  ]

  return <section className="dashboard-stack">
    <div className="panel">
      <p className="eyebrow">PAINEL TURBO</p><h2>Seu desempenho na pista</h2><p className="muted small-copy">Aqui eu junto os dados dos seus últimos treinos para ficar mais fácil perceber a evolução.</p>
      <div className="stats-row dashboard-stats">
        <Stat label="Treinos" value={count} /><Stat label="PPM médio" value={avgWpm} />
        <Stat label="Recorde" value={bestWpm} /><Stat label="Precisão média" value={avgAcc} suffix="%" />
      </div>

      <div className="progress-card">
        <div className="progress-head">
          <div><span>Nível atual</span><strong>{level}</strong></div>
          <div><span>Experiência</span><b>{xpInLevel}/200 XP</b></div>
        </div>
        <div className="progress-track"><span style={{ width: `${(xpInLevel / 200) * 100}%` }} /></div>
        <small>Cada corrida rende XP. Precisão alta e velocidade dão um bônus pequeno.</small>
      </div>

      <div className="achievements">
        <p className="eyebrow">CONQUISTAS</p>
        <div className="achievement-grid">
          {achievements.map(item => <div className={item.done ? 'achievement done' : 'achievement'} key={item.title}>
            <span>{item.done ? '✓' : '•'}</span>
            <div><b>{item.title}</b><small>{item.note}</small></div>
          </div>)}
        </div>
      </div>
    </div>
    <div className="panel">
      <p className="eyebrow">RASTRO</p>
      {sessions.length === 0 ? <p className="muted">Finalize sua primeira corrida para começar o rastro.</p> :
        <div className="history-list">{sessions.map(s => <div className="history-row" key={s.id}>
          <div><strong>{s.wpm} PPM</strong><span>{new Date(s.created_at).toLocaleString('pt-BR')}</span></div>
          <div><b>{Number(s.accuracy).toFixed(1)}%</b><span>{s.errors} erros · {s.duration_seconds}s</span></div>
        </div>)}</div>
      }
    </div>
  </section>
}

export default function Home() {
  const [tab, setTab] = useState('treinar')
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [huntText, setHuntText] = useState('')

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data } = supabase?.auth.onAuthStateChange((_event, session) => setUser(session?.user || null)) || { data: null }
    return () => data?.subscription?.unsubscribe()
  }, [])

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setTab('treinar')}><span className="rat-mark">R</span><strong>Rato</strong><em>Turbo</em></button>
      <nav>
        <button className={tab === 'treinar' ? 'nav-active' : ''} onClick={() => setTab('treinar')}>Corrida</button>
        <button className={tab === 'aprender' ? 'nav-active' : ''} onClick={() => setTab('aprender')}>Aprender</button>
        <button className={tab === 'estatisticas' ? 'nav-active' : ''} onClick={() => setTab('estatisticas')}>Desempenho</button>
        <button className={tab === 'caca' ? 'nav-active' : ''} onClick={() => setTab('caca')}>Modo Caça</button>
        <button className="account-btn" onClick={() => setAuthOpen(true)}>{user ? 'Minha toca' : 'Entrar'}</button>
      </nav>
    </header>

    <div className="shell">
      <section className="hero">
        <p className="eyebrow">A PISTA É O TECLADO</p>
        <h1>Menos caça ao teclado. Mais <em>turbo.</em></h1>
        <p>Criei o RatoTurbo para praticar digitação de um jeito mais simples e divertido. A ideia é ir melhorando o projeto enquanto ele também ajuda você a melhorar no teclado.</p>
      </section>

      <div className="tabs-mobile">
        <button className={tab === 'treinar' ? 'active' : ''} onClick={() => setTab('treinar')}>Corrida</button>
        <button className={tab === 'aprender' ? 'active' : ''} onClick={() => setTab('aprender')}>Aprender</button>
        <button className={tab === 'estatisticas' ? 'active' : ''} onClick={() => setTab('estatisticas')}>Rastro</button>
        <button className={tab === 'caca' ? 'active' : ''} onClick={() => setTab('caca')}>Caça</button>
        <button onClick={() => setAuthOpen(true)}>{user ? 'Toca' : 'Entrar'}</button>
      </div>

      {tab === 'treinar' && <Trainer user={user} initialText={huntText} onSaved={() => setRefreshKey(k => k+1)} />}
      {tab === 'aprender' && <Learn />}
      {tab === 'estatisticas' && <Dashboard user={user} refreshKey={refreshKey} />}
      {tab === 'caca' && <HuntMode user={user} onTrain={(text) => { setHuntText(text); setTab('treinar') }} />}

      <footer>
        <span>RatoTurbo · projeto pessoal em desenvolvimento</span>
        <small>Feito aos poucos.</small>
      </footer>
    </div>
    {authOpen && <AuthBox user={user} onClose={() => setAuthOpen(false)} />}
  </main>
}
