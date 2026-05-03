import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Message } from '@/database/types';
import { useChatMessages } from '@/features/chats/hooks/useChatMessages';
import type { ChatsStackParamList } from '@/navigation/types';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '@/services/media/mediaService';
import { useChatSocket } from '@/services/websocket/useChatSocket';
import { useAuthStore } from '@/store/auth.store';

type Props = NativeStackScreenProps<ChatsStackParamList, 'ChatRoom'>;

export function ChatRoomScreen({ route }: Props) {
  const [draft, setDraft] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { messages, sendImageMessage, sendTextMessage } = useChatMessages(route.params.chatId);
  const { status } = useChatSocket();

  const handleSend = async () => {
    const body = draft.trim();

    if (!body || !currentUser) {
      return;
    }

    setDraft('');
    await sendTextMessage({
      body,
      senderId: currentUser.id,
    });
  };

  const handlePickPhoto = async () => {
    if (!currentUser) {
      return;
    }

    setMediaError(null);

    try {
      const photo = await pickPhotoFromLibrary();

      if (photo) {
        await sendImageMessage({ photo, senderId: currentUser.id });
      }
    } catch (error) {
      setMediaError(getMediaErrorMessage(error));
    }
  };

  const handleTakePhoto = async () => {
    if (!currentUser) {
      return;
    }

    setMediaError(null);

    try {
      const photo = await takePhotoWithCamera();

      if (photo) {
        await sendImageMessage({ photo, senderId: currentUser.id });
      }
    } catch (error) {
      setMediaError(getMediaErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
      style={styles.container}
    >
      <FlatList
        ListHeaderComponent={
          status === 'connected' ? null : (
            <Text style={styles.connectionStatus}>Conectando...</Text>
          )
        }
        contentContainerStyle={styles.listContent}
        data={messages}
        inverted
        keyExtractor={(item) => item.clientId}
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={12}
        removeClippedSubviews
        renderItem={({ item }) => <MessageBubble message={item} />}
        windowSize={11}
      />

      <View style={styles.composerRow}>
        <Pressable onPress={handleTakePhoto} style={styles.mediaButton}>
          <Text style={styles.mediaButtonText}>Cam</Text>
        </Pressable>
        <Pressable onPress={handlePickPhoto} style={styles.mediaButton}>
          <Text style={styles.mediaButtonText}>Img</Text>
        </Pressable>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="Mensaje"
          placeholderTextColor="#667781"
          style={styles.composerInput}
          value={draft}
        />
        <Pressable
          disabled={!draft.trim()}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            (!draft.trim() || pressed) && styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </Pressable>
      </View>
      {mediaError ? <Text style={styles.mediaError}>{mediaError}</Text> : null}
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <View style={[styles.bubbleRow, isOutgoing ? styles.bubbleRowOutgoing : styles.bubbleRowIncoming]}>
      <View style={[styles.bubble, isOutgoing ? styles.outgoingBubble : styles.incomingBubble]}>
        {message.type === 'image' ? (
          <ImageMessage message={message} />
        ) : (
          <Text style={styles.messageText}>{message.body}</Text>
        )}
        <View style={styles.messageMetaRow}>
          <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
          {isOutgoing ? <Text style={styles.messageStatus}>{getMessageStatusIcon(message.status)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function ImageMessage({ message }: { message: Message }) {
  const metadata = parseImageMetadata(message.metadataJson);
  const imageUri = metadata.remoteUrl ?? metadata.localUri ?? message.body;
  const uploadProgress = metadata.uploadProgress ?? (message.status === 'pending' ? 0 : 1);

  if (!imageUri) {
    return <Text style={styles.messageText}>Imagen no disponible</Text>;
  }

  return (
    <View>
      <Image
        cachePolicy="disk"
        contentFit="cover"
        source={{ uri: imageUri }}
        style={styles.messageImage}
        transition={120}
      />
      {message.status === 'pending' && uploadProgress < 1 ? (
        <View style={styles.uploadOverlay}>
          <Text style={styles.uploadText}>{Math.round(uploadProgress * 100)}%</Text>
        </View>
      ) : null}
    </View>
  );
}

function getMessageStatusIcon(status: Message['status']) {
  switch (status) {
    case 'pending':
      return '⏱';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '!';
  }
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function parseImageMetadata(metadataJson?: string | null) {
  if (!metadataJson) {
    return {};
  }

  try {
    return JSON.parse(metadataJson) as {
      localUri?: string;
      remoteUrl?: string;
      uploadProgress?: number;
    };
  } catch {
    return {};
  }
}

function getMediaErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'CAMERA_PERMISSION_DENIED') {
    return 'Activa el permiso de camara para tomar fotos.';
  }

  if (error instanceof Error && error.message === 'MEDIA_LIBRARY_PERMISSION_DENIED') {
    return 'Activa el permiso de fotos para elegir una imagen.';
  }

  return 'No pudimos enviar la foto. Intentalo de nuevo.';
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 12,
    maxWidth: '82%',
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 10,
  },
  bubbleRowIncoming: {
    justifyContent: 'flex-start',
  },
  bubbleRowOutgoing: {
    justifyContent: 'flex-end',
  },
  composerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    color: '#111B21',
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerRow: {
    alignItems: 'flex-end',
    backgroundColor: '#ECE5DD',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  connectionStatus: {
    alignSelf: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    color: '#856404',
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  container: {
    backgroundColor: '#ECE5DD',
    flex: 1,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  listContent: {
    paddingBottom: 8,
    paddingTop: 12,
  },
  messageMetaRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  messageStatus: {
    color: '#667781',
    fontSize: 10,
  },
  mediaButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  mediaButtonText: {
    color: '#00A884',
    fontSize: 12,
    fontWeight: '700',
  },
  mediaError: {
    backgroundColor: '#FCE8E6',
    color: '#D93025',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: 'center',
  },
  messageImage: {
    backgroundColor: '#DADDE1',
    borderRadius: 10,
    height: 220,
    width: 240,
  },
  messageText: {
    color: '#111B21',
    fontSize: 16,
    lineHeight: 21,
  },
  messageTime: {
    color: '#667781',
    fontSize: 11,
  },
  outgoingBubble: {
    backgroundColor: '#D9FDD3',
    borderTopRightRadius: 2,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#00A884',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderRadius: 10,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
