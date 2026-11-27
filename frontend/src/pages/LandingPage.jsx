import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, CalendarClock, MapPin, ScanSearch, ShieldCheck } from 'lucide-react'
import FeatureCard from '../components/FeatureCard.jsx'
import Logo from '../components/Logo.jsx'
import ShelfScanVisual from '../components/ShelfScanVisual.jsx'
import '../styles/pages/landing.css'

const STEPS = [
  {
    title: 'Find what you need',
    text: 'Search or browse by category and campus area. Anything already out on loan stays hidden.',
  },
  {
    title: 'Send a request',
    text: 'Pick a return date and add a note. The owner approves or declines the request.',
  },
  {
    title: 'Bring it back',
    text: 'Take a photo when you return it, the owner confirms, and you both rate how it went.',
  },
]

function scrollTo(event, id) {
  event.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage() {
  return (
    <div className="landing" id="top">
      <div className="landing-top-tint" aria-hidden="true" />
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <div className="header-actions">
            <Link className="login-link" to="/login">
              Log in
            </Link>
            <Link className="action-button action-button-orange-tint" to="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">
                <MapPin className="eyebrow-pin" size={14} aria-hidden="true" /> For UIUC students
              </span>
              <h1 id="hero-title">
                Borrow it from
                <br />
                someone <span>on campus</span>
              </h1>
              <p className="hero-description">
                Borrow a camera for the weekend or an iClicker for class, and list things you want
                to lend.
              </p>
              <div className="hero-actions">
                <Link className="action-button action-button-orange-tint" to="/signup">
                  Sign up <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a
                  className="how-link"
                  href="#how-it-works"
                  onClick={(event) => scrollTo(event, 'how-it-works')}
                >
                  How it works <ArrowDown size={14} aria-hidden="true" />
                </a>
              </div>
              <p className="hero-note">Sign up with your NetID.</p>
            </div>
            <ShelfScanVisual />
          </div>
        </section>

        <section className="feature-strip" aria-label="Features">
          <div className="feature-strip-inner">
            <FeatureCard icon={<ScanSearch size={19} />} title="List a whole room at once">
              Take a photo and Lendr drafts a listing for everything it spots.
            </FeatureCard>
            <FeatureCard icon={<ShieldCheck size={19} />} title="Trusted borrowers skip the wait">
              Owners can auto-approve borrowers who return on time and earn good ratings.
            </FeatureCard>
            <FeatureCard icon={<CalendarClock size={19} />} title="Due dates on every loan">
              Borrowers get a reminder before it's due.
            </FeatureCard>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            {STEPS.map(({ title, text }) => (
              <li className="step" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="get-started">
          <div>
            <h2>Got a NetID? You're in!</h2>
            <p>Make an account with your Illinois email and add your first item.</p>
          </div>
          <Link className="action-button action-button-orange-tint" to="/signup">
            Sign up <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <Logo light />
        <p className="site-footer-credit">
          Photos from <a href="https://unsplash.com">Unsplash</a>
        </p>
      </footer>
    </div>
  )
}
