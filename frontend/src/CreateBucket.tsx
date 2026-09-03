import { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

type Bucket = {
  bucket_id: number;
  public_id: string;
  owner_token: string;
  created_at: string;
  last_visit_at: string;
};

type StoredBucket = {
  public_id: string;
  owner_token: string;
};

export default function CreateBucket() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false)
  const [myBuckets, setMyBuckets] = useState<StoredBucket[]>([]);
  const navigate = useNavigate();
 
  useEffect(() => {
    const stored = localStorage.getItem("buckets");
    setMyBuckets(stored ? JSON.parse(stored) : []);
  }, []);

  async function handleCreate() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/buckets`, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data: Bucket = await res.json();
      setBucket(data);
      const stored = localStorage.getItem("buckets");
      const parsed: StoredBucket[] = stored ? JSON.parse(stored) : [];
      const updated = [
        ...parsed,
        { public_id: data.public_id, owner_token: data.owner_token },
      ];
      localStorage.setItem("buckets", JSON.stringify(updated));
      setMyBuckets(updated);
      
    } catch (err) {
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
    <div>
      <h2> Create a new Bucket</h2>
      <h3> Create a bucket to collect and inspect HTTP requests</h3>
      <button onClick={handleCreate}>Create a bucket</button>
      
      {error && <p>{error}</p>}

     
      {bucket && (
        <>
        <p>
          Send requests to: <code>{API_BASE}/{bucket.public_id}</code>
        </p>
        <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        <button onClick={handleContinue}>Go to bucket</button>
        </>
      )}
      

      <h3>Your buckets</h3>
      {myBuckets.length === 0 && <p>No bins yet.</p>}
      <ul>
        {myBuckets.map((b) => (
          <li key={b.public_id}>
            <button onClick={() => navigate(`/bin/${b.public_id}`)}>
              {shortenId(b.public_id)}
            </button>
          </li>
        ))}
      </ul>

    </div>
  );
}