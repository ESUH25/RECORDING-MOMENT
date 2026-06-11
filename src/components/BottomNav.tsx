import './BottomNav.css'
import type { Screen } from '../types'

interface BottomNavProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
}

const NAV_ITEMS = [
  { screen: 'camera'      as Screen, icon: '📷', label: 'Camera'  },
  { screen: 'gallery'     as Screen, icon: '🖼️', label: 'Gallery' },
  { screen: 'frameStudio' as Screen, icon: '✨', label: 'Studio'  },
]

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.screen}
          className={`bottom-nav__btn ${currentScreen === item.screen ? 'active' : ''}`}
          onClick={() => onNavigate(item.screen)}
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
          {currentScreen === item.screen && <span className="bottom-nav__dot" />}
        </button>
      ))}
    </nav>
  )
}