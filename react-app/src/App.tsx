import { useState } from 'react'
import Header from './components/Header'
import TransferModule from './components/TransferModule'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <TransferModule />
    </div>
  )
}

export default App
