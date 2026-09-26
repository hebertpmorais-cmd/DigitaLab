'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  { finger: 'Mindinho E', keys: 'Q A Z' },
  { finger: 'Anelar E', keys: 'W S X' },
  { finger: 'Médio E', keys: 'E D C' },
  { finger: 'Indicador E', keys: 'R F V • T G B' },
  { finger: 'Indicador D', keys: 'Y H N • U J M' },
  { finger: 'Médio D', keys: 'I K ,' },
  { finger: 'Anelar D', keys: 'O L .' },
  { finger: 'Mindinho D', keys: 'P Ç ; /' },
]

function randomText() {
  return TEXTS[Math.floor(Math.random() * TEXTS.length)]
}

function calcStats(input, text, secondsElapsed) {
  const typed = input.length
  let correct = 0
  for (let i = 0; i < typed; i++) if (input[i] === text[i]) correct++
  const errors = typed - correct
  const minutes = Math.max(secondsElapsed / 60, 1 / 60)
  const wpm = Math.round((correct / 5) / minutes)
  const cpm = Math.round(correct / minutes)
  const accuracy = typed ? Math.max(0, Math.round((correct / typed) * 1000) / 10) : 100
  return { typed, correct, errors, wpm, cpm, accuracy }
}

function CharacterText({ text, input }) {
  return (
    <div className="typing-copy" aria-label="Texto do exercício">
      {text.split('').map((char, index) => {
        let cls = 'char'
        if (index < input.length) cls += input[index] === char ? ' correct' : ' wrong'
        else if (index === input.length) cls += ' current'
        return <span className={cls} key={index}>{char}</span>
      })}
    </div>
  )
}

function Stat({ label, value, suffix = '' }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}{suffix}</strong></div>
}

function Trainer() {
  const [duration, setDuration] = useState(30)
  const [text, setText] = useState(TEXTS[0])
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef(null)

  const elapsed = duration - timeLeft
  const stats = useMemo(() => calcStats(input, text, elapsed), [input, text, elapsed])

  useEffect(() => {
    if (!started || finished) return
    if (timeLeft <= 0) {
      setFinished(true)
      setStarted(false)
      return
    }
    const timer = setTimeout(() => setTimeLeft(v => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [started, finished, timeLeft])

  useEffect(() => {
    if (input.length >= text.length && started) {
      setFinished(true)
      setStarted(false)
    }
  }, [input, text, started])

  function reset(nextDuration = duration, nextText = randomText()) {
    setDuration(nextDuration)
    setTimeLeft(nextDuration)
    setText(nextText)
    setInput('')
    setStarted(false)
    setFinished(false)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function handleChange(e) {
    if (finished) return
    const value = e.target.value.slice(0, text.length)
    if (!started && value.length > 0) setStarted(true)
    setInput(value)
  }

  return (
    <section className="panel trainer-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">TREINO RÁPIDO</p>
          <h2>Digite com precisão. A velocidade vem depois.</h2>
        </div>
        <div className="duration-group">
          {[15, 30, 60].map(sec => (
            <button key={sec} className={duration === sec ? 'chip active' : 'chip'} onClick={() => reset(sec)}>{sec}s</button>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <Stat label="Tempo" value={timeLeft} suffix="s" />
        <Stat label="WPM" value={stats.wpm} />
        <Stat label="CPM" value={stats.cpm} />
        <Stat label="Precisão" value={stats.accuracy} suffix="%" />
        <Stat label="Erros" value={stats.errors} />
      </div>

      <button className="typing-area" onClick={() => inputRef.current?.focus()} type="button">
        <CharacterText text={text} input={input} />
        <textarea
          ref={inputRef}
          className="hidden-input"
          value={input}
          onChange={handleChange}
          onPaste={e => e.preventDefault()}
          autoFocus
          spellCheck={false}
          aria-label="Campo de digitação"
        />
      </button>

      <div className="trainer-footer">
        <p>{started ? 'Treino em andamento — mantenha os olhos na tela.' : finished ? 'Treino finalizado.' : 'Comece digitando para iniciar o cronômetro.'}</p>
        <button className="secondary-btn" onClick={() => reset()}>Novo texto</button>
      </div>

      {finished && (
        <div className="result-box">
          <p className="eyebrow">RESULTADO</p>
          <div className="result-main"><strong>{stats.wpm}</strong><span>WPM</span></div>
          <p>{stats.accuracy >= 97 ? 'Ótima precisão. Agora tente aumentar o ritmo gradualmente.' : stats.accuracy >= 93 ? 'Bom equilíbrio. Tente reduzir os erros antes de acelerar.' : 'Priorize a precisão no próximo treino e diminua um pouco o ritmo.'}</p>
          <button className="primary-btn" onClick={() => reset()}>Treinar novamente</button>
        </div>
      )}
    </section>
  )
}

function Learn() {
  const [lesson, setLesson] = useState(0)
  return (
    <section className="learn-grid">
      <div className="panel">
        <p className="eyebrow">POSICIONAMENTO DAS MÃOS</p>
        <h2>Comece sempre pela linha base</h2>
        <p className="muted">No teclado ABNT2, use as saliências das teclas <b>F</b> e <b>J</b> para reencontrar a posição sem olhar.</p>
        <div className="home-row">
          {['A','S','D','F','J','K','L','Ç'].map((k,i) => <div key={k} className={k === 'F' || k === 'J' ? 'key anchor' : 'key'}><b>{k}</b><small>{['ME','AE','MdE','IE','ID','MdD','AD','MD'][i]}</small></div>)}
        </div>
        <div className="finger-grid">
          {HAND_GROUPS.map(item => <div className="finger-card" key={item.finger}><span>{item.finger}</span><strong>{item.keys}</strong></div>)}
        </div>
        <div className="tip-box"><b>Postura:</b> ombros relaxados, cotovelos próximos de 90°, punhos neutros e polegares próximos à barra de espaço.</div>
      </div>

      <div className="panel">
        <p className="eyebrow">AULAS PRÁTICAS</p>
        <h2>Treino progressivo</h2>
        <div className="lesson-list">
          {LESSONS.map((item, index) => (
            <button onClick={() => setLesson(index)} className={lesson === index ? 'lesson active' : 'lesson'} key={item.title}>
              <span>{index + 1}</span><div><b>{item.title}</b><small>{item.keys}</small></div>
            </button>
          ))}
        </div>
        <div className="practice-box">
          <span>Exercício sugerido</span>
          <p>{LESSONS[lesson].text}</p>
        </div>
        <div className="tips">
          <p><b>1.</b> Evite olhar para o teclado, mesmo que fique mais lento no começo.</p>
          <p><b>2.</b> Busque 97% ou mais de precisão antes de tentar bater recordes.</p>
          <p><b>3.</b> Faça sessões curtas e frequentes para desenvolver memória muscular.</p>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [tab, setTab] = useState('treinar')
  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setTab('treinar')}><span>D</span>DigitaLab</button>
        <nav>
          <button className={tab === 'treinar' ? 'nav-active' : ''} onClick={() => setTab('treinar')}>Treinar</button>
          <button className={tab === 'aprender' ? 'nav-active' : ''} onClick={() => setTab('aprender')}>Aprender</button>
          <button disabled>Estatísticas <small>em breve</small></button>
        </nav>
      </header>

      <div className="shell">
        <section className="hero">
          <p className="eyebrow">DIGITAÇÃO MAIS RÁPIDA, SEM ATALHOS</p>
          <h1>Treine velocidade, precisão e <em>técnica.</em></h1>
          <p>Uma plataforma em português para desenvolver memória muscular, reduzir erros e acompanhar sua evolução.</p>
        </section>

        <div className="tabs-mobile">
          <button className={tab === 'treinar' ? 'active' : ''} onClick={() => setTab('treinar')}>Treinar</button>
          <button className={tab === 'aprender' ? 'active' : ''} onClick={() => setTab('aprender')}>Aprender</button>
        </div>

        {tab === 'treinar' ? <Trainer /> : <Learn />}

        <footer>DigitaLab · MVP 1 · Próxima etapa: histórico, gráficos e treino inteligente.</footer>
      </div>
    </main>
  )
}