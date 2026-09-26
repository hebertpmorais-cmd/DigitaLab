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

function calcStats(input, text, secondsElapsed) {
  const typed = input.length
  let correct = 0
  for (let i = 0; i < typed; i++) if (input[i] === text[i]) correct++
  const errors = typed - correct
  const minutes = Math.max(secondsElapsed / 60, 1 / 60)
  return {
    typed, correct, errors,
    wpm: Math.round((correct / 5) / minutes),
    cpm: Math.round(correct / minutes),
    accuracy: typed ? Math.max(0, Math.round((correct / typed) * 1000) / 10) : 100
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
        <div><strong>Precisão</strong><span>Porcentagem do que você digitou corretamente durante a corrida.</span></div>
        <div><strong>Erros</strong><span>Quantidade de caracteres digitados diferente do texto esperado.</span></div>
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

function Trainer({ user, onSaved }) {
  const [duration, setDuration] = useState(30)
  const [text, setText] = useState(TEXTS[0])
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)
  const elapsed = duration - timeLeft
  const stats = useMemo(() => calcStats(input, text, elapsed), [input, text, elapsed])

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

      if (!error && data && stats.errors > 0) {
        const rows = []
        for (let i = 0; i < input.length; i++) {
          if (input[i] !== text[i]) rows.push({
            session_id: data.id, user_id: user.id, position: i,
            expected_char: text[i] ?? '', typed_char: input[i] ?? ''
          })
        }
        if (rows.length) await supabase.from('typing_errors').insert(rows)
      }
      if (!error) onSaved()
    }
    saveResult()
  }, [finished, user, saved, input, text, elapsed, stats, onSaved])

  function reset(nextDuration = duration, nextText = randomText()) {
    setDuration(nextDuration); setTimeLeft(nextDuration); setText(nextText); setInput('')
    setStarted(false); setFinished(false); setSaved(false)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function handleChange(e) {
    if (finished) return
    const value = e.target.value.slice(0, text.length)
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

  return <section className="dashboard-stack">
    <div className="panel">
      <p className="eyebrow">PAINEL TURBO</p><h2>Seu desempenho na pista</h2><p className="muted small-copy">Aqui eu junto os dados dos seus últimos treinos para ficar mais fácil perceber a evolução.</p>
      <div className="stats-row dashboard-stats">
        <Stat label="Treinos" value={count} /><Stat label="PPM médio" value={avgWpm} />
        <Stat label="Recorde" value={bestWpm} /><Stat label="Precisão média" value={avgAcc} suffix="%" />
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
        <button onClick={() => setAuthOpen(true)}>{user ? 'Toca' : 'Entrar'}</button>
      </div>

      {tab === 'treinar' && <Trainer user={user} onSaved={() => setRefreshKey(k => k+1)} />}
      {tab === 'aprender' && <Learn />}
      {tab === 'estatisticas' && <Dashboard user={user} refreshKey={refreshKey} />}

      <footer>
        <span>RatoTurbo · projeto pessoal em desenvolvimento</span>
        <small>Feito aos poucos.</small>
      </footer>
    </div>
    {authOpen && <AuthBox user={user} onClose={() => setAuthOpen(false)} />}
  </main>
}
