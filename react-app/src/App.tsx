import Header from './components/Header'
import TransferModule from './components/TransferModule'
import ChainDataModule from './components/ChainDataModule'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-full">
        <TransferModule />
        
        <ChainDataModule />
      </main>
    </div>
  )
}

export default App
