import Header from './components/Header'
import TransferModule from './components/TransferModule'
import ChainDataModule from './components/ChainDataModule'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <TransferModule />
      
      <ChainDataModule />
    </div>
  )
}

export default App
