import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

function App() {
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    supabase
      .from('students')
      .select('*')
      .limit(1)
      .then(({ error }) => {
        if (error && error.code === '42P01') {
          setStatus('Connected — no tables yet (expected)')
        } else if (error) {
          setStatus(`Error: ${error.message}`)
        } else {
          setStatus('Connected — tables exist')
        }
      })
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">E-School Portal</h1>
      <p className="text-muted-foreground text-sm">{status}</p>
      <Button>Get Started</Button>
    </div>
  )
}

export default App
