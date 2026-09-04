import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addStoredBucket,
  getStoredBuckets,
  removeStoredBucket,
  type StoredBucket,
} from "./lib/binStorage";
import { ApiError, deleteBucket } from "./lib/api";
import {
  ArrowDoodle,
  Bucket as PailArt,
  CheckDoodle,
  CopyDoodle,
  PencilDoodle,
  TrashDoodle,
  WavyRule,
} from "./components/Doodles";
import FlowerButton from "./components/FlowerButton";
import SiteHeader from "./components/SiteHeader";
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
  // Edit mode reveals the per-bucket delete; `pendingDelete` is the one bucket
  // currently asking "are you sure?", so a stray click can't drop a bucket.
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();

  function toggleEditing() {
    setPendingDelete(null);
    setDeleteError(null);
    setEditing((on) => !on);
  }

  async function handleDelete(bucketToDelete: StoredBucket) {
    setDeleteError(null);
    setDeletingId(bucketToDelete.public_id);

    try {
      // Drops the bucket and every request captured into it, server-side.
      await deleteBucket(bucketToDelete.public_id, bucketToDelete.owner_token);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Couldn't delete that bucket. Is the backend running?",
      );
      setDeletingId(null);
      return;
    }

    const updated = removeStoredBucket(bucketToDelete.public_id);
    setMyBuckets(updated);
    setPendingDelete(null);
    setDeletingId(null);
    if (updated.length === 0) setEditing(false);
  }

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

  return (
    <div className="page">
      <SiteHeader />

      <main className="create-bucket">
        <section className="hero">
          <PailArt size={150} className="hero-pail" />

          <div className="hero-copy">
            <h1>Create a new Bucket</h1>
            <WavyRule className="hero-squiggle" color="var(--sunny)" />

            <p className="hero-prompt">Ready to catch some requests?</p>
            <FlowerButton onClick={handleCreate} color="coral">
              Create a bucket
            </FlowerButton>
          </div>
        </section>

        {error && (
          <p className="note note-error" role="alert">
            {error}
          </p>
        )}

        {bucket && (
          <div className="paper new-bucket">
            <p className="new-bucket-lead muted">Send requests to</p>
            <code className="new-bucket-url">{API_BASE}/{bucket.public_id}</code>

            <div className="button-row">
              <button className="ink-button ink-button--sunny" onClick={handleCopy}>
                {copied ? <CheckDoodle size={18} /> : <CopyDoodle size={18} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button className="ink-button ink-button--coral" onClick={handleContinue}>
                Go to bucket
                <ArrowDoodle size={18} />
              </button>
            </div>
          </div>
        )}

        <section className="buckets">
          <div className="buckets-head">
            <div className="buckets-head-copy">
              <h2 className="section-title">Your buckets</h2>
              <p className="section-sub">Pick a bucket to inspect the requests.</p>
            </div>

            {myBuckets.length > 0 && (
              <button
                className="ink-button buckets-edit"
                onClick={toggleEditing}
                aria-pressed={editing}
              >
                {editing ? <CheckDoodle size={16} /> : <PencilDoodle size={16} />}
                {editing ? "Done" : "Edit"}
              </button>
            )}
          </div>

          {editing && (
            <p className="buckets-hint muted">
              Deleting a bucket also deletes every request it caught. This can't be undone.
            </p>
          )}

          {deleteError && (
            <p className="note note-error" role="alert">
              {deleteError}
            </p>
          )}

          {myBuckets.length === 0 ? (
            <div className="paper bucket-box bucket-box-empty">
              <PailArt size={64} className="empty-pail" />
              <p className="muted">You don't have any buckets yet.</p>
              <p className="muted">Create one to get started.</p>
            </div>
          ) : (
            <div className="paper bucket-box">
              <ul className="bucket-list">
                {myBuckets.map((b, i) => (
                  <li key={b.public_id} className="bucket-item">
                    {pendingDelete === b.public_id ? (
                      <div className="bucket-confirm">
                        <span className="bucket-confirm-text">
                          Delete <strong>Bucket #{i + 1}</strong>?
                        </span>
                        <div className="bucket-confirm-actions">
                          <button
                            className="ink-button ink-button--coral"
                            onClick={() => handleDelete(b)}
                            disabled={deletingId === b.public_id}
                          >
                            <TrashDoodle size={16} />
                            {deletingId === b.public_id ? "Deleting…" : "Delete"}
                          </button>
                          <button
                            className="ink-button"
                            onClick={() => setPendingDelete(null)}
                            disabled={deletingId === b.public_id}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="bucket-row"
                          onClick={() => navigate(`/bin/${b.public_id}`)}
                        >
                          <span className="bucket-row-copy">
                            <span className="bucket-row-name">Bucket #{i + 1}</span>
                            <span className="bucket-row-id mono">{b.public_id}</span>
                          </span>
                          {!editing && <ArrowDoodle size={18} className="bucket-row-arrow" />}
                        </button>

                        {editing && (
                          <button
                            className="bucket-delete"
                            onClick={() => setPendingDelete(b.public_id)}
                            aria-label={`Delete Bucket #${i + 1}`}
                          >
                            <TrashDoodle size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
