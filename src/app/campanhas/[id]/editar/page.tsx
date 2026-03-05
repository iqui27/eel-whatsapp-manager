'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Editar page — redirects back to /campanhas/nova with the campaign pre-loaded.
 * For MVP, we redirect to the nova page. Full edit-in-place is a Phase 04 enhancement.
 */
export default function EditarCampanhaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    // For MVP, redirect to the campaigns list; future: pre-populate /campanhas/nova
    router.replace('/campanhas');
  }, [router, params.id]);

  return null;
}
