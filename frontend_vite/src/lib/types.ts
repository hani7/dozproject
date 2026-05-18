export type UserRole = 'admin' | 'prevendeur' | 'livreur';
export type Specialite = 'detail' | 'gros' | 'les_deux';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  specialite: Specialite;
  access: string;
  refresh: string;
}

export interface Product {
  id: number;
  nom: string;
  code: string;
  description?: string;
  cartons_par_palette: number;    // how many cartons per palette
  prix_achat: number;             // per palette
  prix_detail: number;            // per carton
  prix_gros: number;              // per carton
  stock_actuel: number;           // in cartons
  stock_minimum: number;          // in cartons
  stock_faible: boolean;
  stock_palettes: number;         // computed: full palettes
  stock_cartons_restants: number; // computed: leftover cartons
  image?: string;
  actif: boolean;
}



export interface Client {
  id: number;
  nom: string;
  type_client: 'detail' | 'gros';
  phone: string;
  adresse: string;
  wilaya: string;
  email: string;
  solde: number;
  notes: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Fournisseur {
  id: number;
  nom: string;
  phone: string;
  email: string;
  adresse: string;
  wilaya: string;
  contact_nom: string;
  solde: number;
  notes: string;
}

export interface OrderItem {
  id?: number;
  produit: number;
  produit_nom?: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface Order {
  id: number;
  reference: string;
  type_commande: 'detail' | 'gros';
  client: number;
  client_nom: string;
  client_phone: string;
  client_adresse: string;
  prevendeur: number;
  prevendeur_nom: string;
  livreur?: number;
  livreur_nom?: string;
  statut: 'en_attente' | 'confirmee' | 'en_livraison' | 'livree' | 'annulee';
  montant_total: number;
  notes: string;
  date_livraison_souhaitee?: string | null;
  lignes: OrderItem[];
  created_at: string;
}

export interface Employe {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  phone: string;
  salaire_base: number;
  date_embauche: string;
  actif: boolean;
}

export interface StockMovement {
  id: number;
  produit: number;
  produit_nom: string;
  type_mouvement: 'entree' | 'sortie' | 'ajustement';
  motif: string;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  reference: string;
  notes: string;
  created_at: string;
}

export interface DashboardStats {
  produits: { total: number; stock_faible: number; valeur_stock: number };
  ventes: { ce_mois_count: number; ce_mois_total: number; detail_total: number; gros_total: number };
  commandes: { en_attente: number; en_livraison: number };
  clients: number;
  fournisseurs: number;
  sales_chart: { date: string; total: number }[];
}
