import { useState } from 'react'
import { SettingsProvider } from './lib/settings'
import { useRoute } from './lib/router'
import { BANK } from './data/bank'
import { Home } from './pages/Home'
import { PracticeSession } from './pages/PracticeSession'

function Routes() {
  const [page] = useRoute()
  const [run, setRun] = useState(0)
  switch (page) {
    case 'practica':
      return <PracticeSession key={run} questions={BANK} mode="tema" onRestart={() => setRun((r) => r + 1)} />
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
