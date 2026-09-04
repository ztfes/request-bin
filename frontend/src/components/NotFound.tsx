import { Link } from "react-router-dom";
import { BackDoodle, Bubble, Bucket as PailArt } from "./Doodles";
import SiteHeader from "./SiteHeader";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="page">
      <SiteHeader />
      <main className="not-found">
        <div className="paper lifted not-found-card">
          <div className="not-found-art" aria-hidden="true">
            <PailArt size={96} className="not-found-pail" />
            <Bubble color="coral" size={22} className="not-found-bubble" />
          </div>
          <h2>Page not found</h2>
          <p className="muted">The page you're looking for doesn't exist.</p>
          <Link className="ink-button ink-button--lime" to="/">
            <BackDoodle size={18} />
            Go to home
          </Link>
        </div>
      </main>
    </div>
  );
}
