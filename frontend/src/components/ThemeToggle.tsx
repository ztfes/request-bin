import { useTheme } from '../theme/ThemeContext'
import './ThemeToggle.css'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isChumBucket = theme === 'chum-bucket'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isChumBucket ? 'professional' : 'Chumm Bucket'} theme`}
    >
      {isChumBucket ? '🪣 Chumm Bucket' : '💼 Professional'}
    </button>
  )
}

export default ThemeToggle
