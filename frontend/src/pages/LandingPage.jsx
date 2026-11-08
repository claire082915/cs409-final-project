import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import Logo from '../components/Logo.jsx'
import '../styles/pages/landing.css'

function scrollTo(event, id) {
  event.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage() {
  return (
    <div className="landing" id="top">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#how-it-works" onClick={(event) => scrollTo(event, 'how-it-works')}>
              How it works
            </a>
            <a href="#why-lendr" onClick={(event) => scrollTo(event, 'why-lendr')}>
              Why Lendr
            </a>
          </nav>
          <div className="header-actions">
            <Link className="login-link" to="/login">
              Log in
            </Link>
            <Button to="/signup" variant="small">
              Sign up
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> GOOD THINGS ARE CLOSER THAN YOU THINK
              </span>
              <h1 id="hero-title">
                Borrow. Lend.
                <br />
                <span>Keep it simple.</span>
              </h1>
              <p className="hero-description">
                Share the things you have. Find the things you need. Keep every loan easy,
                thoughtful, and close to home.
              </p>
              <div className="hero-actions">
                <Button href="#get-started">
                  Get started <span aria-hidden="true">→</span>
                </Button>
                <a
                  className="how-link"
                  href="#how-it-works"
                  onClick={(event) => scrollTo(event, 'how-it-works')}
                >
                  <span className="play-icon">▷</span> See how it works
                </a>
              </div>
              <div className="neighbor-proof">
                <div className="avatar-stack" aria-hidden="true">
                  <span>J</span>
                  <span>M</span>
                  <span>A</span>
                  <span>+</span>
                </div>
                <p>
                  <strong>Good neighbors share.</strong>
                  <br />
                  Start with the people around you.
                </p>
              </div>
            </div>
            <div
              className="hero-visual"
              aria-label="A collection of useful items ready to share"
              role="img"
            >
              <div className="visual-sun" />
              <div className="visual-arc arc-one" />
              <div className="visual-arc arc-two" />
              <div className="hero-photo" />
              <div className="photo-label label-top">
                <span className="label-icon">✦</span>
                <span>
                  <b>Pass it along</b>
                  <small>Good things go further</small>
                </span>
              </div>
              <div className="photo-label label-bottom">
                <span className="label-heart">♡</span>
                <span>
                  <b>Borrow with confidence</b>
                  <small>A little trust goes a long way</small>
                </span>
              </div>
              <div className="visual-spark spark-one">✳</div>
              <div className="visual-spark spark-two">✦</div>
            </div>
          </div>
          <a
            href="#how-it-works"
            className="scroll-cue"
            onClick={(event) => scrollTo(event, 'how-it-works')}
          >
            <span /> Scroll to explore
          </a>
        </section>

        <section className="feature-strip" id="why-lendr" aria-label="What makes Lendr useful">
          <div className="feature-strip-inner">
            <FeatureCard icon="▧" title="Track with photos">
              See an item’s condition when it leaves and when it comes back.
            </FeatureCard>
            <FeatureCard icon="◷" title="Remember return dates">
              A friendly nudge helps everyone stay on the same page.
            </FeatureCard>
            <FeatureCard icon="♡" title="Grow your circle">
              Build a little trust with every loan and return.
            </FeatureCard>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading">
            <span className="eyebrow">SHARING, MADE SIMPLE</span>
            <h2>
              Good things go further
              <br />
              when we share.
            </h2>
            <p>
              Lendr keeps the little details in one place, so borrowing from a neighbor feels easy.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step-number">01</span>
              <div>
                <h3>Find something useful</h3>
                <p>Browse what people nearby are happy to lend.</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">02</span>
              <div>
                <h3>Agree on the details</h3>
                <p>Set a return date and note the item’s condition together.</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">03</span>
              <div>
                <h3>Bring it back with care</h3>
                <p>Confirm the return and keep your sharing circle thriving.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="get-started" id="get-started">
          <div>
            <span className="eyebrow">YOUR NEIGHBORHOOD IS FULL OF GOOD THINGS</span>
            <h2>Ready to share a little more?</h2>
            <p>Make borrowing and lending feel easy from the very first hello.</p>
          </div>
          <Button href="#how-it-works" variant="light">
            See how it works <span aria-hidden="true">→</span>
          </Button>
        </section>
      </main>

      <footer className="site-footer">
        <Logo light />
        <span>Borrow a little. Share a lot.</span>
        <span>© 2025 Lendr</span>
      </footer>
    </div>
  )
}
