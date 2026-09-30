'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { persistRace } from '../lib/race-save.mjs'
import { TEXTS } from '../lib/race-texts'
import { measureEdit, exerciseResult, isCourseComplete } from '../lib/learning.mjs'

const LESSONS = [
  { title: 'Linha base', keys: 'asdf jklç', objective: 'Fixar a posição inicial das mãos e voltar naturalmente para F e J.', text: 'asdf jklç asdf jklç fj fj dk dk sl sl aç aç' },
  { title: 'Linha superior', keys: 'qwerty uiop', objective: 'Alcançar a linha superior sem deslocar a mão inteira.', text: 'queiro teto tipo pior quero perto toque equipe roteiro' },
  { title: 'Linha inferior', keys: 'zxcvb nm', objective: 'Praticar a descida dos dedos mantendo os punhos neutros.', text: 'zona caixa vivo banco nome cinema vinho combo' },
  { title: 'Palavras', keys: 'alfabeto completo', objective: 'Juntar as três linhas e manter precisão em palavras completas.', text: 'trabalho estudo foco teclado prática ritmo precisão velocidade' },
]

const HAND_GROUPS = [
  { finger: 'Mindinho E', keys: 'Q A Z' }, { finger: 'Anelar E', keys: 'W S X' },
  { finger: 'Médio E', keys: 'E D C' }, { finger: 'Indicador E', keys: 'R F V • T G B' },
  { finger: 'Indicador D', keys: 'Y H N • U J M' }, { finger: 'Médio D', keys: 'I K ,' },
  { finger: 'Anelar D', keys: 'O L .' }, { finger: 'Mindinho D', keys: 'P Ç ; /' },
]

const TRAINING_MODES = [
  { id: 'text', label: 'Texto', note: 'Frases completas' },
  { id: 'words', label: 'Palavras', note: 'Palavras soltas' },
  { id: 'numbers', label: 'Números', note: 'Sequências numéricas' },
  { id: 'symbols', label: 'Símbolos', note: 'Pontuação e sinais' }
]

const MODE_WORDS = [
  'teclado','ritmo','foco','prática','precisão','velocidade','memória','estudo',
  'trabalho','dedos','pista','controle','texto','palavra','toque','movimento',
  'resultado','treino','acerto','natural','tempo','linha','base','técnica'
]

function generateTrainingText(mode = 'text', previousText = '') {
  if (mode === 'words') {
    return Array.from({ length: 24 }, (_, i) => MODE_WORDS[(i * 7 + Math.floor(Math.random() * MODE_WORDS.length)) % MODE_WORDS.length]).join(' ')
  }

  if (mode === 'numbers') {
    return Array.from({ length: 14 }, () => String(Math.floor(100 + Math.random() * 9900))).join(' ')
  }

  if (mode === 'symbols') {
    const groups = ['! @ # $ %', '& * ( )', '- _ + =', ': ; , .', '? / \\', '[ ] { }', '< > |']
    return Array.from({ length: 5 }, (_, i) => groups[(i + Math.floor(Math.random() * groups.length)) % groups.length]).join('   ')
  }

  const choices = TEXTS.filter(item => item !== previousText)
  return choices[Math.floor(Math.random() * choices.length)]
}

const randomText = () => generateTrainingText('text')

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
  const [mode, setMode] = useState('text')
  const [text, setText] = useState(initialText || TEXTS[0])
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const raceSave = useRef({ id: null, busy: false })
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
      setMode('text')
      setText(initialText)
      setInput('')
      setTimeLeft(duration)
      setStarted(false)
      setFinished(false)
      setSaveStatus('idle'); raceSave.current = { id: null, busy: false }
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

  async function saveResult() {
    const attempt = raceSave.current
    if (!user || attempt.busy || ['saved', 'partial'].includes(saveStatus)) return
    attempt.busy = true
    attempt.id ||= crypto.randomUUID()
    setSaveStatus('saving')
    try {
      const result = await persistRace(supabase, {
        id: attempt.id,
        user_id: user.id,
        duration_seconds: Math.max(1, elapsed),
        mode,
        wpm: stats.wpm,
        cpm: stats.cpm,
        accuracy: stats.accuracy,
        errors: stats.errors,
        typed_chars: stats.typed,
        correct_chars: stats.correct
      }, errorEvents)
      if (raceSave.current === attempt) setSaveStatus(result)
      onSaved()
    } catch {
      if (raceSave.current === attempt) setSaveStatus('error')
    } finally {
      attempt.busy = false
    }
  }

  useEffect(() => {
    if (finished && user && input.length > 0 && saveStatus === 'idle') saveResult()
  }, [finished, user, input, saveStatus])

  function reset(nextDuration = duration, nextText = generateTrainingText(mode, text)) {
    setDuration(nextDuration); setTimeLeft(nextDuration); setText(nextText); setInput('')
    setStarted(false); setFinished(false); setSaveStatus('idle'); raceSave.current = { id: null, busy: false }; setAttempts(0); setErrorEvents([])
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setText(generateTrainingText(nextMode))
    setInput('')
    setTimeLeft(duration)
    setStarted(false)
    setFinished(false)
    setSaveStatus('idle'); raceSave.current = { id: null, busy: false }
    setAttempts(0)
    setErrorEvents([])
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
    <div className="mode-picker">
      <div className="mode-picker-head">
        <span>Tipo de corrida</span>
        <small>{TRAINING_MODES.find(item => item.id === mode)?.note}</small>
      </div>
      <div className="mode-picker-options">
        {TRAINING_MODES.map(item => <button
          type="button"
          key={item.id}
          className={mode === item.id ? 'mode-chip active' : 'mode-chip'}
          onClick={() => changeMode(item.id)}
          disabled={started}
        >{item.label}</button>)}
      </div>
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
      <button className="secondary-btn" onClick={() => reset(duration, generateTrainingText(mode, text))}>Nova corrida</button>
    </div>
    {finished && <div className="result-box">
      <p className="eyebrow">CHEGADA {user && ['saved', 'partial'].includes(saveStatus) ? '• RASTRO SALVO' : ''}</p>
      <div role="status" aria-live="polite">
        {user && saveStatus === 'saving' && <p>Salvando sua corrida…</p>}
        {user && saveStatus === 'error' && <>
          <p>Não foi possível confirmar o salvamento. Tente novamente antes de sair ou iniciar outra corrida.</p>
          <button className="secondary-btn" onClick={saveResult}>Tentar salvar novamente</button>
        </>}
        {user && saveStatus === 'partial' && <p>Resultado salvo no histórico, mas os detalhes das teclas erradas não foram confirmados.</p>}
        {!user && <p>Você correu como visitante. Este resultado não foi salvo no histórico.</p>}
      </div>
      <div className="result-main"><strong>{stats.wpm}</strong><span>PPM</span></div>
      <p>{stats.accuracy >= 97 ? 'Ótima precisão. Agora tente aumentar o ritmo gradualmente.' : stats.accuracy >= 93 ? 'Bom equilíbrio. Tente reduzir os erros antes de acelerar.' : 'Priorize a precisão no próximo treino e diminua um pouco o ritmo.'}</p>
      <button className="primary-btn" onClick={() => reset(duration, generateTrainingText(mode, text))}>Correr novamente</button>
    </div>}
  </section>
}

function Learn({ user }) {
  const [lesson, setLesson] = useState(0)
  const [practiceInput, setPracticeInput] = useState('')
  const [practiceAttempts, setPracticeAttempts] = useState(0)
  const [practiceErrors, setPracticeErrors] = useState(0)
  const [learningProgress, setLearningProgress] = useState({})
  const [progressMessage, setProgressMessage] = useState('')
  const [openGuide, setOpenGuide] = useState(null)
  const [practiceMistakes, setPracticeMistakes] = useState([])
  const [reviewText, setReviewText] = useState('')
  const [loadStatus, setLoadStatus] = useState(user ? 'loading' : 'ready')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveInFlight = useRef(false)
  const resultHandled = useRef(false)

  const practiceText = reviewText || LESSONS[lesson].text
  const progress = Math.min(100, (practiceInput.length / practiceText.length) * 100)
  const result = exerciseResult(practiceInput, practiceText, practiceAttempts, practiceErrors)
  const practiceAccuracy = result.accuracy.toFixed(1)
  const navigationBusy = loadStatus !== 'ready' || saveStatus === 'saving' || saveStatus === 'error'

  const practiceKeyboardRows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L','Ç'],
    ['Z','X','C','V','B','N','M',',','.',';']
  ]

  const currentPracticeChar = practiceInput.length < practiceText.length
    ? practiceText[practiceInput.length]
    : ''

  const currentPracticeKey = currentPracticeChar === ' '
    ? 'ESPAÇO'
    : currentPracticeChar.toLocaleUpperCase('pt-BR')

  const currentPracticeFinger = currentPracticeChar === ' '
    ? 'Polegar'
    : fingerForKey(currentPracticeChar)

  const currentPracticeHand = currentPracticeChar === ' '
    ? 'Ambas as mãos'
    : currentPracticeFinger.endsWith(' E')
      ? 'Mão esquerda'
      : currentPracticeFinger.endsWith(' D')
        ? 'Mão direita'
        : 'Tecla especial'

  useEffect(() => {
    let cancelled = false
    if (!user) return
    setLoadStatus('loading')
    async function load() {
      try {
        if (!supabase) throw new Error('unavailable')
        const { data, error } = await supabase.from('learning_progress')
          .select('lesson_index, best_accuracy, completed, completed_at')
          .eq('user_id', user.id)
          .order('lesson_index', { ascending: true })
        if (error) throw error
        if (cancelled) return
        const mapped = {}
        for (const item of data || []) mapped[item.lesson_index] = item
        setLearningProgress(mapped)
        setLoadStatus('ready')
      } catch {
        if (!cancelled) setLoadStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, loadAttempt])

  const completedCount = LESSONS.filter((_, index) => learningProgress[index]?.completed).length
  const courseProgress = Math.round((completedCount / LESSONS.length) * 100)
  const nextLesson = LESSONS.findIndex((_, index) => !learningProgress[index]?.completed)
  const currentLessonCompleted = Boolean(learningProgress[lesson]?.completed)
  const currentLessonFinishedNow = !reviewText && result.passed
  const canContinue = currentLessonCompleted || currentLessonFinishedNow

  const mistakeSummary = Object.entries(practiceMistakes.reduce((acc, item) => {
    const key = item.expected || ''
    if (!key || key === ' ') return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {}))
    .map(([key, count]) => ({ key, count, finger: fingerForKey(key) }))
    .sort((a,b) => b.count - a.count)
    .slice(0,4)

  const learnImages = [
    {
      title: 'Posição inicial',
      src: '/learn/posicao-inicial-chat.png',
      text: 'Comece pela linha base. F e J servem como referência para posicionar as mãos sem precisar olhar.'
    },
    {
      title: 'Movimento correto',
      src: '/learn/movimento-correto-chat.png',
      text: 'O dedo alcança a tecla da região dele e depois volta para a posição inicial. Evite deslocar a mão inteira.'
    },
    {
      title: 'Região de cada dedo',
      src: '/learn/mapa-dedos-chat.png',
      text: 'Veja quais teclas ficam sob responsabilidade de cada dedo para diminuir movimentos desnecessários.'
    },
    {
      title: 'Postura correta',
      src: '/learn/postura-correta-chat.png',
      text: 'Mantenha costas apoiadas, ombros relaxados, cotovelos próximos de 90° e punhos neutros.'
    },
    {
      title: 'Erros comuns',
      src: '/learn/erros-comuns-chat.png',
      text: 'Evite olhar para o teclado, mover a mão inteira, levantar os punhos e manter os dedos rígidos.'
    }
  ]

  function changeLesson(index) {
    if (navigationBusy) return
    resultHandled.current = false
    setSaveStatus('idle')
    setLesson(index)
    setPracticeInput('')
    setPracticeAttempts(0)
    setPracticeErrors(0)
    setPracticeMistakes([])
    setReviewText('')
    setProgressMessage('')
  }

  function goPreviousLesson() {
    if (lesson <= 0) return
    changeLesson(lesson - 1)
  }

  function goNextLesson() {
    if (lesson >= LESSONS.length - 1 || !canContinue || navigationBusy) return
    changeLesson(lesson + 1)
  }

  function goRecommendedLesson() {
    if (nextLesson >= 0) changeLesson(nextLesson)
  }

  function startMistakeReview() {
    if (!mistakeSummary.length || navigationBusy) return
    resultHandled.current = false
    setSaveStatus('idle')
    setReviewText(buildHuntText(mistakeSummary.map(item => item.key)))
    setPracticeInput('')
    setPracticeAttempts(0)
    setPracticeErrors(0)
    setPracticeMistakes([])
    setProgressMessage('')
  }

  function returnToLesson() {
    resultHandled.current = false
    setSaveStatus('idle')
    setReviewText('')
    setPracticeInput('')
    setPracticeAttempts(0)
    setPracticeErrors(0)
    setPracticeMistakes([])
    setProgressMessage('')
  }

  async function saveLessonProgress() {
    if (reviewText || !result.finished || loadStatus !== 'ready' || saveInFlight.current) return
    const previous = learningProgress[lesson]
    const payload = {
      ...(user ? { user_id: user.id } : {}),
      lesson_index: lesson,
      best_accuracy: Math.max(Number(previous?.best_accuracy || 0), result.accuracy),
      completed: Boolean(previous?.completed || result.passed),
      completed_at: previous?.completed_at || (result.passed ? new Date().toISOString() : null),
      updated_at: new Date().toISOString()
    }
    if (!user) {
      setLearningProgress(current => ({ ...current, [lesson]: payload }))
      setProgressMessage(result.passed ? 'Aula concluída nesta sessão. Entre para salvar as próximas aulas na sua conta.' : 'Tente novamente para chegar a 97% de precisão.')
      return
    }
    saveInFlight.current = true
    setSaveStatus('saving')
    setProgressMessage('Salvando seu resultado...')
    try {
      if (!supabase) throw new Error('unavailable')
      const { data, error } = await supabase.from('learning_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_index' })
        .select('lesson_index, best_accuracy, completed, completed_at')
        .single()
      if (error || !data) throw error || new Error('missing result')
      setLearningProgress(current => ({ ...current, [lesson]: data }))
      setSaveStatus('saved')
      setProgressMessage(result.passed ? 'Aula concluída e progresso salvo.' : 'Resultado salvo. Tente chegar a 97% para concluir a aula.')
    } catch {
      setSaveStatus('error')
      setProgressMessage('Não foi possível salvar. Seu resultado continua nesta tela; tente novamente antes de sair.')
    } finally {
      saveInFlight.current = false
    }
  }

  function handlePractice(e) {
    if (result.finished || loadStatus !== 'ready') return
    const value = e.target.value.slice(0, practiceText.length)
    const edit = measureEdit(practiceInput, value, practiceText)
    setPracticeAttempts(total => total + edit.attempts)
    setPracticeErrors(total => total + edit.errors)
    if (edit.mistakes.length) setPracticeMistakes(current => [...current, ...edit.mistakes])
    setPracticeInput(value)
  }

  useEffect(() => {
    if (reviewText || !result.finished || loadStatus !== 'ready' || resultHandled.current) return
    resultHandled.current = true
    saveLessonProgress()
  }, [result.finished, reviewText, loadStatus])

  return <section className="learn-stack">
    <div className="panel">
      <p className="eyebrow">POSICIONAMENTO DAS MÃOS</p>
      <h2>Primeiro entenda onde cada dedo deve ficar</h2>
      <p className="muted">Antes de tentar ganhar velocidade, vale criar o hábito de voltar sempre para a linha base e movimentar só o necessário.</p>

      {loadStatus === 'loading' && <p role="status">Carregando seu progresso...</p>}
      {loadStatus === 'error' && <div role="alert" className="practice-save-note">
        Não foi possível carregar seu progresso.
        <button className="secondary-btn" onClick={() => setLoadAttempt(value => value + 1)}>Tentar carregar novamente</button>
      </div>}
      <div className="learning-path">
        <div className="learning-path-head">
          <div>
            <span>Progresso da trilha</span>
            <strong>{completedCount}/{LESSONS.length} aulas</strong>
          </div>
          <b>{courseProgress}%</b>
        </div>
        <div className="learning-path-track"><span style={{ width: `${courseProgress}%` }} /></div>
        <small>{nextLesson === -1 ? 'Trilha inicial concluída.' : `Próxima recomendada: ${LESSONS[nextLesson].title}`}</small>
      </div>

      <div className="learn-image-grid visual-guides final-guides">
        {learnImages.map((item,index) => <button
          type="button"
          className="learn-image-card guide-button final-guide-card"
          key={item.title}
          onClick={() => setOpenGuide({ ...item, index })}
        >
          <img src={item.src} alt={item.title} />
          <div className="final-guide-footer">
            <div className="final-guide-meta">
              <span>GUIA {index + 1}</span>
              <b>{item.title}</b>
            </div>
            <p>{item.text}</p>
            <span className="guide-open-hint">Ampliar guia ↗</span>
          </div>
        </button>)}
      </div>

      <div className="home-row">{['A','S','D','F','J','K','L','Ç'].map((k,i) =>
        <div key={k} className={k === 'F' || k === 'J' ? 'key anchor' : 'key'}>
          <b>{k}</b><small>{['ME','AE','MdE','IE','ID','MdD','AD','MD'][i]}</small>
        </div>
      )}</div>

      <div className="finger-grid">{HAND_GROUPS.map(item =>
        <div className="finger-card" key={item.finger}><span>{item.finger}</span><strong>{item.keys}</strong></div>
      )}</div>

      <div className="tip-box"><b>Postura:</b> ombros relaxados, cotovelos próximos de 90°, punhos neutros e polegares próximos à barra de espaço.</div>
    </div>

    <div className="panel practice-panel">
      <p className="eyebrow">EXERCÍCIO PRÁTICO</p>
      <h2>Agora é sua vez</h2>
      <p className="muted small-copy">Veja os cinco guias acima e depois pratique aqui. O foco é repetir o movimento certo até ele começar a ficar natural.</p>

      <div className={reviewText ? 'lesson-focus-card review' : 'lesson-focus-card'}>
        <div className="lesson-focus-top">
          <span>{reviewText ? 'REVISÃO INTELIGENTE' : `Aula ${lesson + 1} de ${LESSONS.length}`}</span>
          <b>{reviewText ? 'Treino dos seus erros' : LESSONS[lesson].title}</b>
        </div>
        <p>{reviewText ? 'Este mini treino foi montado com as teclas que mais escaparam na sua última tentativa.' : LESSONS[lesson].objective}</p>
        <small>{reviewText ? 'Quando terminar, volte à aula e tente novamente.' : 'Meta para concluir: finalizar o exercício com pelo menos 97% de precisão.'}</small>
      </div>

      <div className="lesson-list learn-lessons">{LESSONS.map((item,index) => {
        const progressItem = learningProgress[index]
        const classes = [lesson === index ? 'lesson active' : 'lesson', progressItem?.completed ? 'completed' : ''].join(' ')
        return <button disabled={navigationBusy} onClick={() => changeLesson(index)} className={classes} key={item.title}>
          <span>{progressItem?.completed ? '✓' : index+1}</span>
          <div>
            <b>{item.title}</b>
            <small>{item.keys}</small>
            {progressItem && <em>Melhor precisão: {Number(progressItem.best_accuracy).toFixed(1)}%</em>}
          </div>
        </button>
      })}</div>

      <div className="practice-live-stats">
        <div><span>Precisão</span><strong>{practiceAccuracy}%</strong></div>
        <div><span>Erros</span><strong>{practiceErrors}</strong></div>
        <div><span>Progresso</span><strong>{Math.round(progress)}%</strong></div>
      </div>

      <div className="practice-target">
        <CharacterText text={practiceText} input={practiceInput} />
      </div>

      <div className="finger-coach">
        <div className="finger-coach-main">
          <span>Próxima tecla</span>
          <strong>{currentPracticeKey || '✓'}</strong>
        </div>
        <div className="finger-coach-info">
          <div><span>Dedo</span><b>{currentPracticeChar ? currentPracticeFinger : 'Exercício concluído'}</b></div>
          <div><span>Mão</span><b>{currentPracticeChar ? currentPracticeHand : '—'}</b></div>
        </div>
      </div>

      <div className="practice-keyboard" aria-label="Teclado virtual ABNT2">
        {practiceKeyboardRows.map((row,rowIndex) => <div className="practice-keyboard-row" key={rowIndex}>
          {row.map(key => {
            const target = currentPracticeChar !== ' ' && normalizeKey(key) === normalizeKey(currentPracticeChar)
            const anchor = key === 'F' || key === 'J'
            return <div className={`practice-key ${target ? 'target' : ''} ${anchor ? 'anchor' : ''}`} key={key}>
              {key}
            </div>
          })}
        </div>)}
        <div className="practice-space-row">
          <div className={`practice-space ${currentPracticeChar === ' ' ? 'target' : ''}`}>ESPAÇO</div>
        </div>
      </div>

      <textarea
        className="practice-entry"
        value={practiceInput}
        onChange={handlePractice}
        onPaste={e => e.preventDefault()}
        onDrop={e => e.preventDefault()}
        readOnly={result.finished || loadStatus !== 'ready'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Clique aqui e comece a digitar o exercício..."
        aria-label="Exercício prático de digitação"
      />

      <div className="practice-progress"><span style={{ width: `${progress}%` }} /></div>

      {practiceInput.length >= practiceText.length && mistakeSummary.length > 0 && <div className="lesson-diagnosis">
        <div className="lesson-diagnosis-head">
          <div>
            <p className="eyebrow">REVISÃO DOS ERROS</p>
            <h3>Estas teclas mais escaparam</h3>
          </div>
          {!reviewText && <button className="primary-btn" disabled={navigationBusy} onClick={startMistakeReview}>Treinar meus erros</button>}
        </div>
        <div className="lesson-error-grid">
          {mistakeSummary.map(item => <div className="lesson-error-key" key={item.key}>
            <strong>{item.key.toLocaleUpperCase('pt-BR')}</strong>
            <div><b>{item.count} {item.count === 1 ? 'erro' : 'erros'}</b><small>{item.finger}</small></div>
          </div>)}
        </div>
      </div>}

      {reviewText && practiceInput.length >= practiceText.length && <div className="review-complete">
        <div><b>Revisão concluída.</b><span>Agora volte à aula e tente novamente com mais controle.</span></div>
        <button className="primary-btn" onClick={returnToLesson}>Voltar à aula</button>
      </div>}
      {!user && <div className="practice-save-note">Entre na sua toca para salvar o progresso das aulas.</div>}
      {progressMessage && <div role={saveStatus === 'error' ? 'alert' : 'status'} className="practice-save-note">
        {progressMessage}
        {saveStatus === 'error' && <button className="secondary-btn" onClick={saveLessonProgress}>Tentar salvar novamente</button>}
      </div>}

      <div className="practice-actions">
        <p>{practiceInput.length >= practiceText.length
          ? result.passed
            ? 'Aula concluída com a precisão necessária.'
            : 'Exercício finalizado. Repita para chegar a 97% de precisão.'
          : 'Digite com calma e tente não olhar para o teclado.'}</p>
        <button className="secondary-btn" disabled={saveStatus === 'saving'} onClick={() => {
          resultHandled.current = false
          setSaveStatus('idle')
          setProgressMessage('')
          setPracticeInput('')
          setPracticeAttempts(0)
          setPracticeErrors(0)
          setPracticeMistakes([])
        }}>Recomeçar</button>
      </div>

      {!reviewText && <div className="lesson-navigation">
        <button className="secondary-btn" disabled={lesson === 0 || navigationBusy} onClick={goPreviousLesson}>← Aula anterior</button>
        <div className="lesson-navigation-center">
          <span>{currentLessonCompleted ? 'Aula já concluída' : canContinue ? 'Pronto para avançar' : 'Conclua com 97%+ para avançar'}</span>
          {lesson < LESSONS.length - 1
            ? <button className="primary-btn" disabled={!canContinue || navigationBusy} onClick={goNextLesson}>Próxima aula →</button>
            : isCourseComplete(learningProgress, LESSONS.length)
              ? <div className="course-complete">Trilha inicial concluída ✓</div>
              : null}
        </div>
      </div>}

      {!reviewText && nextLesson >= 0 && nextLesson !== lesson && <button className="recommended-lesson" disabled={navigationBusy} onClick={goRecommendedLesson}>
        Continuar da próxima recomendada: <b>{LESSONS[nextLesson].title}</b>
      </button>}
    </div>

    {openGuide && <div className="guide-modal" onMouseDown={e => {
      if (e.target === e.currentTarget) setOpenGuide(null)
    }}>
      <div className="guide-modal-content">
        <button
          className="guide-close"
          type="button"
          aria-label="Fechar imagem ampliada"
          onClick={() => setOpenGuide(null)}
        >×</button>
        <div className="guide-modal-number">{openGuide.index + 1}</div>
        <img src={openGuide.src} alt={openGuide.title} />
        <div className="guide-modal-text">
          <p className="eyebrow">GUIA {openGuide.index + 1} DE {learnImages.length}</p>
          <h3>{openGuide.title}</h3>
          <p>{openGuide.text}</p>
        </div>
      </div>
    </div>}
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


function PerformanceChart({ sessions, metric, goal, title, suffix = '' }) {
  const data = sessions.slice(0, 12).reverse()
  if (data.length < 2) {
    return <div className="evolution-empty">Faça pelo menos 2 corridas para começar a ver a evolução.</div>
  }

  const values = data.map(item => metric === 'wpm' ? Number(item.wpm) : Number(item.accuracy))
  const width = 600
  const height = 180
  const padX = 28
  const padY = 24

  const minValue = metric === 'accuracy'
    ? Math.max(0, Math.min(...values, Number(goal)) - 5)
    : 0
  const maxValue = metric === 'accuracy'
    ? 100
    : Math.max(...values, Number(goal), 20)

  const range = Math.max(1, maxValue - minValue)
  const xFor = index => padX + (index * (width - padX * 2)) / Math.max(1, data.length - 1)
  const yFor = value => height - padY - ((value - minValue) / range) * (height - padY * 2)
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ')
  const goalY = yFor(Number(goal))

  const firstHalf = values.slice(0, Math.ceil(values.length / 2))
  const lastHalf = values.slice(Math.floor(values.length / 2))
  const avg = list => list.reduce((sum, value) => sum + value, 0) / Math.max(1, list.length)
  const change = avg(lastHalf) - avg(firstHalf)

  return <div className="evolution-card">
    <div className="evolution-head">
      <div>
        <b>{title}</b>
        <small>Últimas {data.length} corridas</small>
      </div>
      <span className={change > 0 ? 'trend up' : change < 0 ? 'trend down' : 'trend'}>
        {change > 0 ? '+' : ''}{change.toFixed(metric === 'accuracy' ? 1 : 0)}{suffix}
      </span>
    </div>

    <svg className="evolution-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
      <line className="chart-grid" x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} />
      <line className="chart-goal" x1={padX} y1={goalY} x2={width - padX} y2={goalY} />
      <polyline className={metric === 'wpm' ? 'chart-line ppm' : 'chart-line accuracy'} points={points} />
      {values.map((value, index) => <circle
        key={index}
        className={value >= Number(goal) ? 'chart-point goal-hit' : 'chart-point'}
        cx={xFor(index)}
        cy={yFor(value)}
        r="4"
      />)}
    </svg>

    <div className="chart-footer">
      <span>Meta: <b>{goal}{suffix}</b></span>
      <span>Atual: <b>{values[values.length - 1]}{suffix}</b></span>
    </div>
  </div>
}

function Dashboard({ user, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(Boolean(user))
  const [goals, setGoals] = useState({ daily_runs_goal: 5, ppm_goal: 60, accuracy_goal: 97 })
  const [goalDraft, setGoalDraft] = useState({ daily_runs_goal: 5, ppm_goal: 60, accuracy_goal: 97 })
  const [goalMessage, setGoalMessage] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)

  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [goalsStatus, setGoalsStatus] = useState(user ? 'loading' : 'ready')
  const [historyMode, setHistoryMode] = useState('all')
  const [historyDays, setHistoryDays] = useState('all')
  const [historyPage, setHistoryPage] = useState(1)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    async function load() {
      try {
        if (!supabase) throw new Error('unavailable')
        const { data, error } = await supabase.from('typing_sessions')
          .select('id, created_at, wpm, accuracy, errors, duration_seconds, mode')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(500)
        if (error) throw error
        if (!cancelled) { setSessions(data || []); setHistoryPage(1) }
      } catch {
        if (!cancelled) setLoadError('Não foi possível carregar seu histórico. Tente novamente.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, refreshKey, reload])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setGoalsStatus('loading')
    async function loadGoals() {
      try {
        if (!supabase) throw new Error('unavailable')
        const { data, error } = await supabase.from('user_typing_goals')
          .select('daily_runs_goal, ppm_goal, accuracy_goal')
          .eq('user_id', user.id).maybeSingle()
        if (error) throw error
        if (cancelled) return
        const loaded = data ? {
          daily_runs_goal: Number(data.daily_runs_goal),
          ppm_goal: Number(data.ppm_goal),
          accuracy_goal: Number(data.accuracy_goal)
        } : { daily_runs_goal: 5, ppm_goal: 60, accuracy_goal: 97 }
        setGoals(loaded)
        setGoalDraft(loaded)
        setGoalsStatus('ready')
      } catch {
        if (!cancelled) setGoalsStatus('error')
      }
    }
    loadGoals()
    return () => { cancelled = true }
  }, [user?.id, reload])

  async function saveGoals(e) {
    e.preventDefault()
    if (!user || savingGoals || goalsStatus !== 'ready') return
    setGoalMessage('')

    const clean = {
      daily_runs_goal: Math.min(50, Math.max(1, Math.round(Number(goalDraft.daily_runs_goal)) || 1)),
      ppm_goal: Math.min(300, Math.max(1, Math.round(Number(goalDraft.ppm_goal)) || 1)),
      accuracy_goal: Math.min(100, Math.max(50, Number(goalDraft.accuracy_goal) || 50))
    }

    setSavingGoals(true)
    try {
      if (!supabase) throw new Error('unavailable')
      const { data, error } = await supabase.from('user_typing_goals').upsert({
        user_id: user.id, ...clean, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
        .select('daily_runs_goal, ppm_goal, accuracy_goal').single()
      if (error || !data) throw error || new Error('missing result')
      setGoals(clean)
      setGoalDraft(clean)
      setGoalMessage('Metas salvas.')
    } catch {
      setGoalMessage('Não consegui salvar agora. Tente novamente.')
    } finally {
      setSavingGoals(false)
    }
  }

  if (!user) return <section className="panel empty-state"><p className="eyebrow">ESTATÍSTICAS</p><h2>Entre para acompanhar sua evolução</h2><p className="muted">Entre na sua conta para ver o histórico e acompanhar suas metas.</p></section>
  if (loading) return <section className="panel"><p className="muted">Carregando estatísticas...</p></section>

  if (loadError || goalsStatus === 'error') return <section className="panel">
    <p role="alert">{loadError || 'Não foi possível carregar suas metas. Tente novamente.'}</p>
    <button className="secondary-btn" onClick={() => setReload(value => value + 1)}>Tentar novamente</button>
  </section>
  if (goalsStatus === 'loading') return <section className="panel"><p role="status">Carregando suas metas...</p></section>

  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (Number(historyDays) - 1))
  const filteredHistory = sessions.filter(item =>
    (historyMode === 'all' || item.mode === historyMode) &&
    (historyDays === 'all' || new Date(item.created_at) >= cutoff)
  )
  const historyPages = Math.max(1, Math.ceil(filteredHistory.length / 20))
  const currentHistoryPage = Math.min(historyPage, historyPages)
  const visibleHistory = filteredHistory.slice((currentHistoryPage - 1) * 20, currentHistoryPage * 20)
  const count = sessions.length
  const avgWpm = count ? Math.round(sessions.reduce((a,s) => a+Number(s.wpm),0)/count) : 0
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
  const localDateKey = (value) => {
    const date = value instanceof Date ? value : new Date(value)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const today = new Date()
  const todayKey = localDateKey(today)
  const dailyGoal = goals.daily_runs_goal
  const todaySessions = sessions.filter(s => localDateKey(s.created_at) === todayKey)
  const todayCount = todaySessions.length
  const dailyProgress = Math.min(100, (todayCount / dailyGoal) * 100)
  const todayBestPpm = todaySessions.length ? Math.max(...todaySessions.map(s => s.wpm)) : 0
  const todayBestAccuracy = todaySessions.length ? Math.max(...todaySessions.map(s => Number(s.accuracy))) : 0
  const ppmProgress = Math.min(100, (todayBestPpm / goals.ppm_goal) * 100)
  const accuracyProgress = Math.min(100, (todayBestAccuracy / goals.accuracy_goal) * 100)

  const activityByDay = {}
  sessions.forEach(s => {
    const key = localDateKey(s.created_at)
    activityByDay[key] = (activityByDay[key] || 0) + 1
  })

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = localDateKey(date)
    return {
      key,
      label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      count: activityByDay[key] || 0,
      today: key === todayKey
    }
  })

  const uniqueDays = new Set(Object.keys(activityByDay))
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  let streakCursor = uniqueDays.has(todayKey) ? new Date(today) : new Date(yesterday)
  let streak = 0
  while (uniqueDays.has(localDateKey(streakCursor))) {
    streak++
    streakCursor.setDate(streakCursor.getDate() - 1)
  }

  const achievements = [
    { title: 'Primeira corrida', done: count >= 1, note: 'Complete 1 corrida.' },
    { title: 'Pegando ritmo', done: count >= 10, note: 'Complete 10 corridas.' },
    { title: 'Precisão afiada', done: sessions.some(s => Number(s.accuracy) >= 98), note: 'Faça uma corrida com 98% ou mais de precisão.' },
    { title: 'Turbo ligado', done: sessions.some(s => s.wpm >= 60), note: 'Alcance 60 PPM em uma corrida.' },
    { title: 'Na rotina', done: streak >= 3, note: 'Treine por 3 dias seguidos.' }
  ]

  return <section className="dashboard-stack">
    <div className="panel">
      <p className="eyebrow">PAINEL TURBO</p><h2>Seu desempenho na pista</h2><p className="muted small-copy">Indicadores dos seus últimos 500 treinos, considerando todos os modos. Datas e metas diárias seguem o horário do seu dispositivo.</p>
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

      <div className="goals-section">
        <div className="goals-head">
          <div>
            <p className="eyebrow">MINHAS METAS</p>
            <h3>Escolha o ritmo que faz sentido para você</h3>
          </div>
        </div>

        <form className="goals-form" onSubmit={saveGoals}>
          <label>
            Corridas por dia
            <input type="number" min="1" max="50" value={goalDraft.daily_runs_goal}
              onChange={e => setGoalDraft(g => ({ ...g, daily_runs_goal: e.target.value }))} />
          </label>
          <label>
            Meta de PPM
            <input type="number" min="1" max="300" value={goalDraft.ppm_goal}
              onChange={e => setGoalDraft(g => ({ ...g, ppm_goal: e.target.value }))} />
          </label>
          <label>
            Meta de precisão (%)
            <input type="number" min="50" max="100" step="0.1" value={goalDraft.accuracy_goal}
              onChange={e => setGoalDraft(g => ({ ...g, accuracy_goal: e.target.value }))} />
          </label>
          <button className="secondary-btn" disabled={savingGoals || goalsStatus !== 'ready'}>{savingGoals ? 'Salvando...' : 'Salvar metas'}</button>
        </form>
        {goalMessage && <small role="status" className="goal-message">{goalMessage}</small>}

        <div className="goal-progress-grid">
          <div className="goal-progress-card">
            <div><span>Corridas hoje</span><strong>{todayCount}/{dailyGoal}</strong></div>
            <div className="routine-track"><span style={{ width: `${dailyProgress}%` }} /></div>
          </div>
          <div className="goal-progress-card">
            <div><span>Melhor PPM de hoje</span><strong>{todayBestPpm}/{goals.ppm_goal}</strong></div>
            <div className="routine-track"><span style={{ width: `${ppmProgress}%` }} /></div>
          </div>
          <div className="goal-progress-card">
            <div><span>Melhor precisão de hoje</span><strong>{todayBestAccuracy.toFixed(1)}%/{goals.accuracy_goal}%</strong></div>
            <div className="routine-track"><span style={{ width: `${accuracyProgress}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="routine-grid">
        <div className="routine-card">
          <div className="routine-title"><span>Meta de hoje</span><strong>{todayCount}/{dailyGoal}</strong></div>
          <div className="routine-track"><span style={{ width: `${dailyProgress}%` }} /></div>
          <small>{todayCount >= dailyGoal ? 'Meta concluída hoje.' : `Faltam ${dailyGoal - todayCount} corrida(s) para completar a meta.`}</small>
        </div>
        <div className="routine-card streak-card">
          <span>Sequência atual</span>
          <strong>{streak} {streak === 1 ? 'dia' : 'dias'}</strong>
          <small>{streak > 0 ? 'Continue treinando para manter o rastro.' : 'Faça uma corrida hoje para começar uma sequência.'}</small>
        </div>
      </div>

      <div className="evolution-section">
        <div className="evolution-title">
          <div>
            <p className="eyebrow">EVOLUÇÃO</p>
            <h3>Como seus últimos treinos estão andando</h3>
          </div>
          <small>Compare velocidade e precisão nas últimas 12 corridas.</small>
        </div>
        <div className="evolution-grid">
          <PerformanceChart sessions={sessions} metric="wpm" goal={goals.ppm_goal} title="Velocidade" suffix=" PPM" />
          <PerformanceChart sessions={sessions} metric="accuracy" goal={goals.accuracy_goal} title="Precisão" suffix="%" />
        </div>
      </div>

      <div className="week-card">
        <div className="week-head">
          <div><b>Últimos 7 dias</b><small>Quantidade de corridas por dia</small></div>
          <span>{weekDays.reduce((sum, day) => sum + day.count, 0)} corridas</span>
        </div>
        <div className="week-days">
          {weekDays.map(day => <div className={day.today ? 'week-day today' : 'week-day'} key={day.key}>
            <div className={day.count ? 'week-dot active' : 'week-dot'}><strong>{day.count}</strong></div>
            <span>{day.label}</span>
          </div>)}
        </div>
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
      <div className="history-filters">
        <label>Período<select value={historyDays} onChange={e => { setHistoryDays(e.target.value); setHistoryPage(1) }}>
          <option value="all">Todo o histórico carregado</option><option value="1">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
        </select></label>
        <label>Modo de treino<select value={historyMode} onChange={e => { setHistoryMode(e.target.value); setHistoryPage(1) }}>
          <option value="all">Todos os modos</option>{TRAINING_MODES.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select></label>
      </div>
      <p className="muted small-copy" role="status">{filteredHistory.length} corrida(s) encontrada(s). Os filtros afetam apenas o histórico.</p>
      {sessions.length === 0 ? <p className="muted">Finalize sua primeira corrida para começar o rastro.</p> : filteredHistory.length === 0 ? <p className="muted">Nenhuma corrida neste período e modo.</p> :
        <div className="history-list">{visibleHistory.map(s => <div className="history-row" key={s.id}>
          <div><strong>{s.wpm} PPM</strong><span>{new Date(s.created_at).toLocaleString('pt-BR')}</span></div>
          <div><b>{Number(s.accuracy).toFixed(1)}%</b><span>{s.errors} erros · {s.duration_seconds}s · {TRAINING_MODES.find(item => item.id === s.mode)?.label || 'Treino'}</span></div>
        </div>)}</div>
      }
      {historyPages > 1 && <div className="history-pagination">
        <button className="secondary-btn" disabled={currentHistoryPage === 1} onClick={() => setHistoryPage(value => value - 1)}>Página anterior</button>
        <span>Página {currentHistoryPage} de {historyPages}</span>
        <button className="secondary-btn" disabled={currentHistoryPage === historyPages} onClick={() => setHistoryPage(value => value + 1)}>Próxima página</button>
      </div>}
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

      {tab === 'treinar' && <Trainer key={user?.id || 'guest'} user={user} initialText={huntText} onSaved={() => setRefreshKey(k => k+1)} />}
      {tab === 'aprender' && <Learn key={user?.id || 'guest'} user={user} />}
      {tab === 'estatisticas' && <Dashboard key={user?.id || 'guest'} user={user} refreshKey={refreshKey} />}
      {tab === 'caca' && <HuntMode user={user} onTrain={(text) => { setHuntText(text); setTab('treinar') }} />}

      <footer>
        <span>RatoTurbo · projeto pessoal em desenvolvimento</span>
        <small>Feito aos poucos.</small>
      </footer>
    </div>
    {authOpen && <AuthBox user={user} onClose={() => setAuthOpen(false)} />}
  </main>
}
