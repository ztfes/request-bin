import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addStoredBucket, getStoredBuckets, type StoredBucket } from "./lib/binStorage";
import Brand from "./components/Brand";
import "./CreateBucket.css";

const API_BASE = "http://localhost:8000";

type Bucket = {
  bucket_id: number;
  public_id: string;
  owner_token: string;
  created_at: string;
  last_visit_at: string;
};

export default function CreateBucket() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false)
  const [myBuckets, setMyBuckets] = useState<StoredBucket[]>(() => getStoredBuckets());
  const navigate = useNavigate();

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
      <Brand />
      <div className="create-bucket">
        <h2>Create a new Bucket</h2>
        <h3 className="subtitle">Create a bucket to collect and inspect HTTP requests</h3>
        <button className="primary-button" onClick={handleCreate}>Create a bucket</button>

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
        {myBuckets.length === 0 && <p className="muted">No bins yet.</p>}
        <ul className="bucket-list">
          {myBuckets.map((b) => (
            <li key={b.public_id}>
              <button className="bucket-list-item" onClick={() => navigate(`/bin/${b.public_id}`)}>
                {shortenId(b.public_id)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}