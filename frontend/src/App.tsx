import { Routes, Route, useParams } from 'react-router-dom'
import CreateBucket from "./CreateBucket";
import BucketInspector from "./components/BucketInspector";
import NotFound from "./components/NotFound";
import ThemeToggle from "./components/ThemeToggle";
import { getOwnerToken } from "./lib/binStorage";

function BucketPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const ownerToken = publicId ? getOwnerToken(publicId) : null

  if (!publicId) return null

  return <BucketInspector publicId={publicId} ownerToken={ownerToken} />
}

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<CreateBucket />} />
        <Route path="/bin/:publicId" element={<BucketPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
