import { Routes, Route, useParams } from 'react-router-dom'
import CreateBucket from "./CreateBucket";
import BinInspector from "./components/BinInspector";
import NotFound from "./components/NotFound";
import { getOwnerToken } from "./lib/binStorage";

function BinPage() {
  const { publicId } = useParams<{ publicId: string }>()
  const ownerToken = publicId ? getOwnerToken(publicId) : null

  if (!publicId) return null

  return <BinInspector publicId={publicId} ownerToken={ownerToken} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateBucket />} />
      <Route path="/bin/:publicId" element={<BinPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
