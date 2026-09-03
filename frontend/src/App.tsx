import { Routes, Route } from 'react-router-dom'
import CreateBucket from "./CreateBucket";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateBucket />} /> 
    </Routes>
  )
}

export default App
