import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import PageNotFound from './lib/PageNotFound';
import Home from './pages/Home';

// Single-page app: navigation is tab state inside Home, so "/" is the only route.
function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      {window.location.pathname === '/' ? <Home /> : <PageNotFound />}
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
