import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { LangProvider } from '@/contexts/LangContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Pages
import Login from '@/pages/Login'
import Dashboard from '@/pages/admin/dashboard'
import Produits from '@/pages/admin/produits'
import Stock from '@/pages/admin/stock'
import Commandes from '@/pages/admin/commandes'
import Clients from '@/pages/admin/clients'
import Fournisseurs from '@/pages/admin/fournisseurs'
import VenteDetail from '@/pages/admin/vente-detail'
import VenteGros from '@/pages/admin/vente-gros'
import Paiements from '@/pages/admin/paiements'
import Achats from '@/pages/admin/achats'
import Categories from '@/pages/admin/categories'
import Comptes from '@/pages/admin/comptes'
import HistoriqueCommandes from '@/pages/admin/historique-commandes'
import RH from '@/pages/admin/rh'
import Livraisons from '@/pages/livreur/livraisons'
import LivreurHistorique from '@/pages/livreur/historique'
import CommandeDetail from '@/pages/prevendeur/commande-detail'
import CommandeGros from '@/pages/prevendeur/commande-gros'
import MesCommandes from '@/pages/prevendeur/mes-commandes'
import PrevendeurClients from '@/pages/prevendeur/clients'
import PrevendeurStock from '@/pages/prevendeur/stock'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/produits" element={<Produits />} />
              <Route path="/admin/stock" element={<Stock />} />
              <Route path="/admin/commandes" element={<Commandes />} />
              <Route path="/admin/clients" element={<Clients />} />
              <Route path="/admin/fournisseurs" element={<Fournisseurs />} />
              <Route path="/admin/vente-detail" element={<VenteDetail />} />
              <Route path="/admin/vente-gros" element={<VenteGros />} />
              <Route path="/admin/paiements" element={<Paiements />} />
              <Route path="/admin/achats" element={<Achats />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/comptes" element={<Comptes />} />
              <Route path="/admin/historique-commandes" element={<HistoriqueCommandes />} />
              <Route path="/admin/rh" element={<RH />} />

              {/* Livreur */}
              <Route path="/livreur/livraisons" element={<Livraisons />} />
              <Route path="/livreur/historique" element={<LivreurHistorique />} />

              {/* Prévendeur */}
              <Route path="/prevendeur/commande-detail" element={<CommandeDetail />} />
              <Route path="/prevendeur/commande-gros" element={<CommandeGros />} />
              <Route path="/prevendeur/mes-commandes" element={<MesCommandes />} />
              <Route path="/prevendeur/clients" element={<PrevendeurClients />} />
              <Route path="/prevendeur/stock" element={<PrevendeurStock />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
