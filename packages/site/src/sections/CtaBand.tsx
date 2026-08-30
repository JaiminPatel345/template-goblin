import { Link } from 'react-router'
import { ArrowRight } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'

/** Closing call-to-action. */
export function CtaBand() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="cta-band">
          <h2>
            Design your first <span className="grad-text">PDF template</span> in minutes.
          </h2>
          <p>
            No sign-up, no install to try it. Open the editor in your browser, or drop the library
            into your backend today.
          </p>
          <div className="hero-cta" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary btn-lg" href={PLAYGROUND_URL}>
              Open the editor <ArrowRight />
            </a>
            <Link className="btn btn-ghost btn-lg" to="/docs/sdk">
              Read the SDK docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
