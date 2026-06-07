import { Routes, Route, Navigate } from 'react-router-dom'
import CustomerApp from './customer/CustomerApp.jsx'
import OwnerApp from './owner/OwnerApp.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerApp />} />
      <Route path="/admin" element={<OwnerApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
