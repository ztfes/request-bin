import { Routes, Route } from 'react-router-dom'
import CreateBucket from "./CreateBucket";
import NotFound from "./components/NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateBucket />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
