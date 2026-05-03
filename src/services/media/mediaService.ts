import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { apiClient } from '@/services/api/apiClient';

export type PickedPhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
};

type PresignedUrlResponse = {
  uploadUrl?: string;
  presignedUrl?: string;
  publicUrl?: string;
  mediaUrl?: string;
  key?: string;
  objectKey?: string;
};

export type UploadedMedia = {
  localUri: string;
  remoteUrl: string;
  objectKey?: string;
  mimeType: string;
  width?: number;
  height?: number;
};

export type UploadProgressHandler = (progress: number) => void;

export async function pickPhotoFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('MEDIA_LIBRARY_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.88,
  });

  return mapPickerResult(result);
}

export async function takePhotoWithCamera() {
  const cameraPermission = await Camera.requestCameraPermissionsAsync();

  if (!cameraPermission.granted) {
    throw new Error('CAMERA_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.88,
  });

  return mapPickerResult(result);
}

export async function uploadPhotoToS3(
  photo: PickedPhoto,
  onProgress?: UploadProgressHandler,
): Promise<UploadedMedia> {
  const presignedUrl = await getPresignedUrl(photo);
  const uploadUrl = presignedUrl.uploadUrl ?? presignedUrl.presignedUrl;
  const remoteUrl = presignedUrl.publicUrl ?? presignedUrl.mediaUrl;

  if (!uploadUrl || !remoteUrl) {
    throw new Error('INVALID_PRESIGNED_URL_RESPONSE');
  }

  await uploadLocalFileWithProgress(uploadUrl, photo.uri, photo.mimeType, onProgress);

  return {
    localUri: photo.uri,
    remoteUrl,
    objectKey: presignedUrl.objectKey ?? presignedUrl.key,
    mimeType: photo.mimeType,
    width: photo.width,
    height: photo.height,
  };
}

async function getPresignedUrl(photo: PickedPhoto) {
  const response = await apiClient.get<PresignedUrlResponse>('/media/presigned-url', {
    params: {
      contentType: photo.mimeType,
      fileName: photo.fileName,
    },
  });

  return response.data;
}

async function uploadLocalFileWithProgress(
  uploadUrl: string,
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgressHandler,
) {
  const fileBlob = await getLocalFileBlob(localUri);

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }

      reject(new Error(`S3_UPLOAD_FAILED_${request.status}`));
    };
    request.onerror = () => reject(new Error('S3_UPLOAD_NETWORK_ERROR'));
    request.send(fileBlob);
  });
}

async function getLocalFileBlob(localUri: string) {
  const response = await fetch(localUri);
  return response.blob();
}

function mapPickerResult(result: ImagePicker.ImagePickerResult): PickedPhoto | null {
  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;

  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? guessMimeType(fileName),
    width: asset.width,
    height: asset.height,
  };
}

function guessMimeType(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerFileName.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}
