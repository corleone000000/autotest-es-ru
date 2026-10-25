import { useMemo, useState } from 'react'
import { SettingsProvider } from './lib/settings'
import { useRoute } from './lib/router'
import { useMyQuestions } from './lib/myQuestions'
import { shuffle } from './lib/random'
import { BANK } from './data/bank'
import { Home } from './pages/Home'
import { PracticeSession } from './pages/PracticeSession'
import { ImportPage } from './pages/Import'
import { MyQuestionsPage } from './pages/MyQuestions'

function MinePractice() {
  const { list } = useMyQuestions()
  const [run, setRun] = useState(0)
  const questions = useMemo(() => (list ? shuffle(list) : null), [list, run]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!questions) return null
  return <PracticeSession key={run} questions={questions} mode="tema" onRestart={() => setRun((r) => r + 1)} />
}

function Routes() {
  const [page, sub] = useRoute()
  const [run, setRun] = useState(0)
  switch (page) {
    case 'practica':
      return <PracticeSession key={run} questions={BANK} mode="tema" onRestart={() => setRun((r) => r + 1)} />
    case 'importar':
      return <ImportPage />
    case 'mis-preguntas':
      return <MyQuestionsPage />
    case 'practicar':
      return sub === 'mias' ? <MinePractice /> : <Home />
    default:
      return <Home />
  }
}

export default function App() {
  return (
    <SettingsProvider>
      <Routes />
    </SettingsProvider>
  )
}
