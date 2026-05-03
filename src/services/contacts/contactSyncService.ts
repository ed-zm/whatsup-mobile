import * as Contacts from 'expo-contacts';

import {
  upsertSyncedContacts,
  type SyncedContact,
} from '@/database/repositories/contactRepository';
import { apiClient } from '@/services/api/apiClient';

type DeviceContactPayload = {
  localContactId: string;
  displayName: string;
  phoneNumbers: string[];
};

type ContactsSyncResponse = {
  contacts?: ApiSyncedContact[];
  registeredContacts?: ApiSyncedContact[];
};

type ApiSyncedContact = {
  id?: string;
  userId?: string;
  phoneNumber?: string;
  phone_number?: string;
  displayName?: string;
  display_name?: string;
  name?: string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  isRegistered?: boolean;
  is_registered?: boolean;
};

export async function syncDeviceContacts() {
  const permission = await Contacts.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error('CONTACTS_PERMISSION_DENIED');
  }

  const deviceContacts = await readDeviceContacts();

  if (deviceContacts.length === 0) {
    return { syncedCount: 0 };
  }

  const response = await apiClient.post<ContactsSyncResponse>('/contacts/sync', {
    contacts: deviceContacts,
  });
  const syncedContacts = mapApiContacts(
    response.data.registeredContacts ?? response.data.contacts ?? [],
  );

  await upsertSyncedContacts(syncedContacts);

  return {
    syncedCount: syncedContacts.length,
  };
}

async function readDeviceContacts(): Promise<DeviceContactPayload[]> {
  const response = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
    pageSize: 10000,
    sort: Contacts.SortTypes.FirstName,
  });

  return response.data
    .map((contact) => {
      const phoneNumbers = dedupe(
        contact.phoneNumbers
          ?.map((phone) => normalizePhoneNumber(phone.number))
          .filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber)) ?? [],
      );

      return {
        localContactId: contact.id ?? contact.name ?? phoneNumbers[0],
        displayName: contact.name,
        phoneNumbers,
      };
    })
    .filter((contact) => contact.phoneNumbers.length > 0);
}

function mapApiContacts(contacts: ApiSyncedContact[]): SyncedContact[] {
  return contacts
    .map<SyncedContact | null>((contact) => {
      const phoneNumber = normalizePhoneNumber(contact.phoneNumber ?? contact.phone_number);
      const id = contact.id ?? contact.userId ?? phoneNumber;

      if (!phoneNumber || !id) {
        return null;
      }

      return {
        id,
        phoneNumber,
        displayName:
          contact.displayName ?? contact.display_name ?? contact.name ?? phoneNumber,
        avatarUrl: contact.avatarUrl ?? contact.avatar_url ?? null,
        status: contact.status ?? null,
        isRegistered: contact.isRegistered ?? contact.is_registered ?? true,
      };
    })
    .filter((contact): contact is SyncedContact => Boolean(contact));
}

function normalizePhoneNumber(phoneNumber?: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const trimmed = phoneNumber.trim();
  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 8) {
    return null;
  }

  return `${hasPlusPrefix ? '+' : ''}${digits}`;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}
