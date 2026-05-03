import { useCallback, useEffect, useState } from 'react';

import { subscribeToDatabaseChanges } from '@/database/changeEvents';
import {
  createOutgoingImageMessage,
  getMessagesForChat,
  type CreateOutgoingMessageInput,
  createOutgoingTextMessage,
  markImageMessageUploaded,
  markOutgoingMessageAsFailed,
  updateImageMessageUploadProgress,
} from '@/database/repositories/messageRepository';
import type { Message } from '@/database/types';
import { uploadPhotoToS3, type PickedPhoto } from '@/services/media/mediaService';
import { chatSocket } from '@/services/websocket/chatSocket';

export function useChatMessages(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextMessages = await getMessagesForChat(chatId);
    setMessages(nextMessages);
    setIsLoading(false);
  }, [chatId]);

  const sendTextMessage = useCallback(
    async (input: Omit<CreateOutgoingMessageInput, 'chatId'>) => {
      const message = await createOutgoingTextMessage({
        ...input,
        chatId,
      });
      const wasSent = chatSocket.sendMessage({
        body: message.body ?? '',
        chatId: message.chatId,
        clientId: message.clientId,
        createdAt: message.createdAt,
        type: 'text',
      });

      if (!wasSent) {
        await markOutgoingMessageAsFailed(message.clientId);
      }
    },
    [chatId],
  );

  const sendImageMessage = useCallback(
    async (input: {
      senderId: string;
      photo: PickedPhoto;
    }) => {
      const message = await createOutgoingImageMessage({
        chatId,
        height: input.photo.height,
        localUri: input.photo.uri,
        mimeType: input.photo.mimeType,
        senderId: input.senderId,
        width: input.photo.width,
      });

      try {
        const upload = await uploadPhotoToS3(
          {
            fileName: input.photo.fileName,
            height: input.photo.height,
            mimeType: input.photo.mimeType,
            uri: input.photo.uri,
            width: input.photo.width,
          },
          (progress) => {
            void updateImageMessageUploadProgress(message.clientId, progress);
          },
        );

        await markImageMessageUploaded(message.clientId, {
          objectKey: upload.objectKey,
          remoteUrl: upload.remoteUrl,
        });

        const wasSent = chatSocket.sendMessage({
          body: null,
          chatId: message.chatId,
          clientId: message.clientId,
          createdAt: message.createdAt,
          mediaUrl: upload.remoteUrl,
          objectKey: upload.objectKey,
          type: 'image',
        });

        if (!wasSent) {
          await markOutgoingMessageAsFailed(message.clientId);
        }
      } catch {
        await markOutgoingMessageAsFailed(message.clientId);
      }
    },
    [chatId],
  );

  useEffect(() => {
    void refresh();

    const unsubscribe = subscribeToDatabaseChanges('messages', refresh);

    return unsubscribe;
  }, [refresh]);

  return {
    isLoading,
    messages,
    refresh,
    sendImageMessage,
    sendTextMessage,
  };
}
