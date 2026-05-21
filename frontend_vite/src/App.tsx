import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { LangProvider } from '@/contexts/LangContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

import { lazy, Suspense } from 'react'

// Pages (Lazy loaded for performance/code-splitting)
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/admin/dashboard'))
const Produits = lazy(() => import('@/pages/admin/produits'))
const Stock = lazy(() => import('@/pages/admin/stock'))
const Commandes = lazy(() => import('@/pages/admin/commandes'))
const Clients = lazy(() => import('@/pages/admin/clients'))
const Fournisseurs = lazy(() => import('@/pages/admin/fournisseurs'))
const VenteDetail = lazy(() => import('@/pages/admin/vente-detail'))
const VenteGros = lazy(() => import('@/pages/admin/vente-gros'))
const Paiements = lazy(() => import('@/pages/admin/paiements'))
const Achats = lazy(() => import('@/pages/admin/achats'))
const Categories = lazy(() => import('@/pages/admin/categories'))
const Comptes = lazy(() => import('@/pages/admin/comptes'))
const HistoriqueCommandes = lazy(() => import('@/pages/admin/historique-commandes'))
const RH = lazy(() => import('@/pages/admin/rh'))
const BonCommande = lazy(() => import('@/pages/admin/bon-commande'))
const Statistiques = lazy(() => import('@/pages/admin/benefices'))
const Livraisons = lazy(() => import('@/pages/livreur/livraisons'))
const LivreurHistorique = lazy(() => import('@/pages/livreur/historique'))
const CommandeDetail = lazy(() => import('@/pages/prevendeur/commande-detail'))
const CommandeGros = lazy(() => import('@/pages/prevendeur/commande-gros'))
const MesCommandes = lazy(() => import('@/pages/prevendeur/mes-commandes'))
const PrevendeurClients = lazy(() => import('@/pages/prevendeur/clients'))
const PrevendeurStock = lazy(() => import('@/pages/prevendeur/stock'))
const Tournee = lazy(() => import('@/pages/prevendeur/tournee'))

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <Toaster position="top-right" />
            <Suspense fallback={<div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
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
              <Route path="/admin/bon-commande" element={<BonCommande />} />
              <Route path="/admin/statistiques" element={<Statistiques />} />

              {/* Livreur */}
              <Route path="/livreur/livraisons" element={<Livraisons />} />
              <Route path="/livreur/historique" element={<LivreurHistorique />} />

              {/* Prévendeur */}
              <Route path="/prevendeur/commande-detail" element={<CommandeDetail />} />
              <Route path="/prevendeur/commande-gros" element={<CommandeGros />} />
              <Route path="/prevendeur/mes-commandes" element={<MesCommandes />} />
              <Route path="/prevendeur/clients" element={<PrevendeurClients />} />
              <Route path="/prevendeur/stock" element={<PrevendeurStock />} />
              <Route path="/prevendeur/tournee" element={<Tournee />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
