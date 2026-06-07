import { business } from '../config.js'

export default function Header() {
  return (
    <header className="header">
      {business.logo ? (
        <img className="logo" src={`/${business.logo}`} alt={`${business.name} logo`} />
      ) : null}
      <h1>{business.name}</h1>
      {business.tagline ? <p className="tagline">{business.tagline}</p> : null}
      {business.facebook ? (
        <a className="fb" href={business.facebook} target="_blank" rel="noreferrer">
          {/* Facebook glyph */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
          </svg>
          Find us on Facebook
        </a>
      ) : null}
    </header>
  )
}
