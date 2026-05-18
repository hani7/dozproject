import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CategoriesPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin/produits'); }, []);
  return null;
}
