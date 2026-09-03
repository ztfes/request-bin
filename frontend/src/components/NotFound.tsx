import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>Page not found</h2>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link className="secondary-button" to="/">Go to home</Link>
    </div>
  );
}
