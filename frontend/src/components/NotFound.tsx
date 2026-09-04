import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext";
import "./NotFound.css";

export default function NotFound() {
  const { theme } = useTheme();
  const isChumBucket = theme === "chum-bucket";

  return (
    <div className="not-found">
      <h2>{isChumBucket ? "Barnacles! Page not found" : "Page not found"}</h2>
      <p className="muted">
        {isChumBucket
          ? "This page sank somewhere in Bikini Bottom."
          : "The page you're looking for doesn't exist."}
      </p>
      <Link className="secondary-button" to="/">Go to home</Link>
    </div>
  );
}
