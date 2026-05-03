import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ChatListItem } from '@/database/repositories/chatRepository';
import { useChatList } from '@/features/chats/hooks/useChatList';
import { useContactSync } from '@/features/contacts/hooks/useContactSync';
import type { ChatsStackParamList } from '@/navigation/types';

const CHAT_ROW_HEIGHT = 76;
type Props = NativeStackScreenProps<ChatsStackParamList, 'ChatList'>;

export function ChatListScreen({ navigation }: Props) {
  const { chats, isLoading, refresh } = useChatList();
  const { contactSyncError, isSyncingContacts, lastSyncedCount, syncContacts } = useContactSync();
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatRow
        chat={item}
        onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, title: item.title })}
      />
    ),
    [navigation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.syncBanner}>
        <View style={styles.syncTextContainer}>
          <Text style={styles.syncTitle}>Contactos</Text>
          <Text style={styles.syncSubtitle}>
            {lastSyncedCount === null
              ? 'Sincroniza para encontrar quienes ya usan WhatsUp.'
              : `${lastSyncedCount} contactos encontrados en WhatsUp.`}
          </Text>
          {contactSyncError ? <Text style={styles.syncError}>{contactSyncError}</Text> : null}
        </View>
        <Pressable
          disabled={isSyncingContacts}
          onPress={syncContacts}
          style={({ pressed }) => [
            styles.syncButton,
            (pressed || isSyncingContacts) && styles.syncButtonDisabled,
          ]}
        >
          {isSyncingContacts ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={chats}
        getItemLayout={(_, index) => ({
          index,
          length: CHAT_ROW_HEIGHT,
          offset: CHAT_ROW_HEIGHT * index,
        })}
        initialNumToRender={14}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isLoading ? 'Cargando chats...' : 'Sin chats locales todavia'}
            </Text>
            <Text style={styles.emptyDescription}>
              Tus conversaciones recientes se leeran desde SQLite para abrir al instante, incluso
              sin internet.
            </Text>
          </View>
        }
        maxToRenderPerBatch={10}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={isLoading} />}
        removeClippedSubviews
        renderItem={renderItem}
        updateCellsBatchingPeriod={50}
        windowSize={9}
      />
    </View>
  );
}

const ChatRow = memo(function ChatRow({
  chat,
  onPress,
}: {
  chat: ChatListItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {chat.avatarUrl ? (
        <Image source={{ uri: chat.avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{chat.title.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text numberOfLines={1} style={styles.chatTitle}>
            {chat.title}
          </Text>
          <Text
            style={[
              styles.timeText,
              chat.unreadCount > 0 && styles.timeTextUnread,
            ]}
          >
            {formatChatTime(chat.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.rowFooter}>
          <Text numberOfLines={1} style={styles.chatSubtitle}>
            {chat.isMuted ? 'Silenciado · ' : ''}
            {chat.isPinned ? 'Fijado · ' : ''}
            {chat.lastMessagePreview}
          </Text>
          {chat.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

function formatChatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#D9FDD3',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarImage: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  avatarText: {
    color: '#128C7E',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#0B141A',
    fontSize: 12,
    fontWeight: '700',
  },
  chatSubtitle: {
    color: '#667781',
    fontSize: 14,
    flex: 1,
  },
  chatTitle: {
    color: '#111B21',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  emptyDescription: {
    color: '#667781',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#111B21',
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#EEF0F1',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    height: CHAT_ROW_HEIGHT,
    paddingHorizontal: 16,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  rowFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  syncBanner: {
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: '#00A884',
    borderRadius: 18,
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  syncError: {
    color: '#D93025',
    fontSize: 12,
    marginTop: 4,
  },
  syncSubtitle: {
    color: '#667781',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  syncTextContainer: {
    flex: 1,
  },
  syncTitle: {
    color: '#111B21',
    fontSize: 14,
    fontWeight: '700',
  },
  timeText: {
    color: '#667781',
    fontSize: 12,
  },
  timeTextUnread: {
    color: '#25D366',
    fontWeight: '700',
  },
});
