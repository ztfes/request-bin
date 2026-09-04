import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addStoredBucket,
  getStoredBuckets,
  removeStoredBucket,
  type StoredBucket,
} from "./lib/binStorage";
import { ApiError, listBucketRequests } from "./lib/api";
import { useBinListWatch } from "./hooks/useBinListWatch";
import BrandMark from "./components/BrandMark";
import { useTheme } from "./theme/ThemeContext";
import "./CreateBucket.css";

const API_BASE = "http://localhost:8000";

const CHUM_AVATAR_COLORS = ["#ded6fb", "#ffd9d0", "#ffe9b3", "#d3e9ff"];
const PRO_AVATAR_COLORS = [
  { bg: "rgba(109, 124, 247, 0.16)", fg: "#8b93f8" },
  { bg: "rgba(248, 113, 113, 0.16)", fg: "#f87171" },
  { bg: "rgba(234, 179, 8, 0.16)", fg: "#eab308" },
];

type Bucket = {
  bucket_id: number;
  public_id: string;
  owner_token: string;
  created_at: string;
  last_visit_at: string;
};

type BucketStats = { total: number; endpoints: number };

function BucketIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.5 7 7 19.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18.5 7" />
      <ellipse cx="12" cy="7" rx="6.5" ry="2" />
    </svg>
  );
}

function LightbulbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a6 6 0 0 0-4 10.5c.6.5 1 1.3 1 2.1V16h6v-1.4c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 2Z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

function EndpointIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function CreateBucket() {
  const { theme } = useTheme();
  const isChumBucket = theme === "chum-bucket";
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false)
  const [myBuckets, setMyBuckets] = useState<StoredBucket[]>(() => getStoredBuckets());
  const [stats, setStats] = useState<Record<string, BucketStats | "error" | undefined>>({});
  const navigate = useNavigate();

  // Memoized so the stats effect below can depend on it honestly instead of
  // re-running on every render. Both only touch stable setters and imports.
  const forgetBucket = useCallback((publicId: string) => {
    const updated = removeStoredBucket(publicId);
    // Hold the same array identity when nothing actually changed. `myBuckets`
    // drives both the stats effect and the socket effect, so handing back a
    // fresh array for a bin that was already dropped would re-run both --
    // and the REST 404 and the socket's 4404 routinely report the same bin.
    setMyBuckets((current) => (current.length === updated.length ? current : updated));
    setStats((s) => {
      if (!(publicId in s)) return s;
      const next = { ...s };
      delete next[publicId];
      return next;
    });
    // Clear the "just created" panel if it was pointing at this bin.
    setBucket((current) => (current?.public_id === publicId ? null : current));
  }, []);

  const loadStats = useCallback((b: StoredBucket, isActive: () => boolean) => {
    listBucketRequests(b.public_id, b.owner_token)
      .then((data) => {
        if (!isActive()) return;
        const endpoints = new Set(data.requests.map((r) => r.path)).size;
        setStats((s) => ({ ...s, [b.public_id]: { total: data.total, endpoints } }));
      })
      .catch((err: unknown) => {
        if (!isActive()) return;
        // A 404 means retention deleted this bin, so stop listing it. Any
        // other failure (backend down, 403) may be temporary -- keep the
        // entry and show it as unreachable, because dropping it would
        // discard the owner token for a bin that still exists.
        if (err instanceof ApiError && err.status === 404) {
          forgetBucket(b.public_id);
          return;
        }
        setStats((s) => ({ ...s, [b.public_id]: "error" }));
      });
  }, [forgetBucket]);

  useEffect(() => {
    let cancelled = false;
    myBuckets.forEach((b) => loadStats(b, () => !cancelled));
    return () => {
      cancelled = true;
    };
  }, [myBuckets, loadStats]);

  // Live updates: a bin expiring drops off the list, and new or trimmed
  // requests refresh that row's counts, without a reload.
  useBinListWatch(myBuckets, {
    onExpired: (b) => forgetBucket(b.public_id),
    onChanged: (b) => loadStats(b, () => true),
  });

  async function handleCreate() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/buckets`, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data: Bucket = await res.json();
      setBucket(data);
      const updated = addStoredBucket({ public_id: data.public_id, owner_token: data.owner_token });
      setMyBuckets(updated);

    } catch {
      setError("Couldn't create a bucket. Is the backend running?");
    }
  }

  const catchAllUrl = bucket ? `${API_BASE}/${bucket.public_id}` : null;

  async function handleCopy() {
        if (!catchAllUrl) return;
        await navigator.clipboard.writeText(catchAllUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }

  function handleContinue() {
    if (bucket) {
      navigate(`/bin/${bucket.public_id}`);
    }
  }

  function shortenId(id: string) {
  return id.slice(0, 5);
  }

  return (
    <div className="create-bucket-page">
      {!isChumBucket && (
        <header className="create-bucket-header">
          <h1>Request Bucket</h1>
        </header>
      )}

      <div className="create-bucket">
        {isChumBucket && <BrandMark />}

        <h2>Create a new Bucket</h2>
        <h3 className="subtitle">Create a bucket to collect and inspect HTTP requests</h3>

        <div className="create-bucket-card">
          <span className="create-bucket-card-icon" aria-hidden="true">
            {isChumBucket ? <img src="/bucket.png" alt="" /> : <BucketIcon size={26} />}
          </span>
          <div className="create-bucket-card-copy">
            <h3>Create a bucket</h3>
            <p>Each bucket has a unique URL where requests are sent.</p>
          </div>
          <button className="primary-button" onClick={handleCreate}>
            <span aria-hidden="true">+</span> Create a bucket
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {bucket && (
          <div className="new-bucket-panel">
            <p>
              Send requests to: <code className="new-bucket-url">{API_BASE}/{bucket.public_id}</code>
            </p>
            <div className="button-row">
              <button className="secondary-button" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
              <button className="secondary-button" onClick={handleContinue}>Go to bucket</button>
            </div>
          </div>
        )}

        <h3 className="section-label">Your buckets</h3>
        {myBuckets.length === 0 && (
          <p className="muted">{isChumBucket ? "No buckets yet — get scooping!" : "No buckets yet."}</p>
        )}

        {myBuckets.length > 0 && (
          <div className="bucket-list-card">
            <ul className="bucket-list">
              {myBuckets.map((b, i) => {
                const stat = stats[b.public_id];
                const statusClass =
                  stat === "error" ? "bucket-status-error" : stat ? "bucket-status-live" : "bucket-status-pending";
                const statusLabel = stat === "error" ? "Unreachable" : stat ? "Live" : "Checking…";
                const proColor = PRO_AVATAR_COLORS[i % PRO_AVATAR_COLORS.length];
                const avatarStyle = isChumBucket
                  ? { background: CHUM_AVATAR_COLORS[i % CHUM_AVATAR_COLORS.length] }
                  : { background: proColor.bg, color: proColor.fg };

                return (
                  <li key={b.public_id}>
                    <button className="bucket-list-item" onClick={() => navigate(`/bin/${b.public_id}`)}>
                      <span className="bucket-avatar" style={avatarStyle} aria-hidden="true">
                        {isChumBucket ? <img src="/bucket.png" alt="" /> : <BucketIcon size={20} />}
                      </span>
                      <span className="bucket-id">{shortenId(b.public_id)}</span>
                      <span className={`bucket-status ${statusClass}`}>
                        <span className="bucket-status-dot" aria-hidden="true" />
                        {statusLabel}
                      </span>
                      {stat && stat !== "error" && (
                        <>
                          <span className="bucket-stat">
                            <TrendIcon /> {stat.total} {stat.total === 1 ? "request" : "requests"}
                          </span>
                          <span className="bucket-stat">
                            <EndpointIcon /> {stat.endpoints} {stat.endpoints === 1 ? "endpoint" : "endpoints"}
                          </span>
                        </>
                      )}
                      <span className="bucket-chevron" aria-hidden="true">
                        <ChevronIcon />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="bucket-list-tip">
              <span className="bucket-list-tip-icon" aria-hidden="true">
                {isChumBucket ? "💡" : <LightbulbIcon size={18} />}
              </span>
              <p>
                <strong>Tip:</strong> You can create as many buckets as you need. Requests are stored in
                real-time and accessible instantly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
