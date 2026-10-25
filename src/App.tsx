import { useEffect, useMemo, useState } from 'react'
import { SettingsProvider } from './lib/settings'
import { ProgressProvider, useProgress } from './lib/progress'
import { requestPersistence } from './lib/db'
import { useRoute } from './lib/router'
import { useMyQuestions } from './lib/myQuestions'
import { shuffle } from './lib/random'
import { Home } from './pages/Home'
import { PracticeSession } from './pages/PracticeSession'
import { ImportPage } from './pages/Import'
import { MyQuestionsPage } from './pages/MyQuestions'
import { ExamPage } from './pages/Exam'
import { FavoritesPractice, ReviewPractice, TopicPractice, TopicsPage } from './pages/Practices'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'

function MinePractice() {
  const { list } = useMyQuestions()
  const { recordAttempts } = useProgress()
  const [run, setRun] = useState(0)
  const questions = useMemo(() => (list ? shuffle(list) : null), [list, run]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!questions) return null
  return <PracticeSession key={run} questions={questions} mode="tema" onAnswer={(a) => recordAttempts([a])} onRestart={() => setRun((r) => r + 1)} />
}

function Routes() {
  const [page, a, b] = useRoute()
  switch (page) {
    case 'temas':
      return <TopicsPage />
    case 'tema':
      return <TopicPractice key={`${a}-${b}`} topic={a ?? 'todos'} count={Number(b) || 10} />
    case 'examen':
      return <ExamPage mode={a === 'real' ? 'real' : 'simulado'} />
    case 'repaso':
      return <ReviewPractice />
    case 'favoritas':
      return <FavoritesPractice />
    case 'importar':
      return <ImportPage />
    case 'mis-preguntas':
      return <MyQuestionsPage />
    case 'practicar':
      return a === 'mias' ? <MinePractice /> : <Home />
    case 'ajustes':
      return <SettingsPage />
    case 'estadisticas':
      return <StatsPage />
    default:
      return <Home />
  }
}

export default function App() {
  useEffect(() => {
    void requestPersistence()
  }, [])
  return (
    <SettingsProvider>
      <ProgressProvider>
        <Routes />
      </ProgressProvider>
    </SettingsProvider>
  )
}
