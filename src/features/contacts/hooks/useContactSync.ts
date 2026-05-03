import { AxiosError } from 'axios';
import { useCallback, useState } from 'react';

import { syncDeviceContacts } from '@/services/contacts/contactSyncService';

export function useContactSync() {
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);
  const [contactSyncError, setContactSyncError] = useState<string | null>(null);

  const syncContacts = useCallback(async () => {
    if (isSyncingContacts) {
      return;
    }

    setIsSyncingContacts(true);
    setContactSyncError(null);

    try {
      const result = await syncDeviceContacts();
      setLastSyncedCount(result.syncedCount);
    } catch (error) {
      setContactSyncError(getContactSyncErrorMessage(error));
    } finally {
      setIsSyncingContacts(false);
    }
  }, [isSyncingContacts]);

  return {
    contactSyncError,
    isSyncingContacts,
    lastSyncedCount,
    syncContacts,
  };
}

function getContactSyncErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'CONTACTS_PERMISSION_DENIED') {
    return 'Activa el permiso de contactos para encontrar amigos que usan WhatsUp.';
  }

  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? 'No pudimos sincronizar tus contactos.';
  }

  return 'No pudimos leer tus contactos. Intentalo de nuevo.';
}
