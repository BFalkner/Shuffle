import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import Home from './pages/Home/Home'
import NotFound from './pages/NotFound'
import OffCenter from './pages/OffCenter/OffCenter'
import Simulator from './pages/Simulator/Simulator'
import GlobalTests from './pages/writeups/GlobalTests'
import ManaTests from './pages/writeups/ManaTests'
import OrderTests from './pages/writeups/OrderTests'

/** Start each page at the top, like a normal link would. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/order-tests" element={<OrderTests />} />
        <Route path="/global-tests" element={<GlobalTests />} />
        <Route path="/mana-tests" element={<ManaTests />} />
        <Route path="/sticky-ends" element={<OffCenter />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
