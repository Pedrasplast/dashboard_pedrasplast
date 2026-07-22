import { useState, useEffect } from 'react';
import { supabase } from '../Servicos/clienteSupabase';

export function usePerfil(user) {
  const [perfil, setPerfil] = useState(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  useEffect(() => {
    async function carregarPerfil() {
      if (!user) {
        setPerfil(null);
        setLoadingPerfil(false);
        return;
      }

      setLoadingPerfil(true);
      const { data, error } = await supabase
        .from('perfis')
        .select('regra')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setPerfil(data);
      } else {
        setPerfil(null);
      }
      setLoadingPerfil(false);
    }

    carregarPerfil();
  }, [user]);

  const isAdmin = perfil?.regra === 'admin';

  return { perfil, isAdmin, loadingPerfil };
}