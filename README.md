# WhatsUp Mobile

Clon de WhatsApp en React Native con Expo, pensado como app offline-first.

## Estructura inicial

```text
src/
  components/           # UI compartida y presentacional
  database/             # SQLite local, schema, migraciones y repositorios offline
    repositories/
  features/             # Modulos de producto por dominio
    auth/
      screens/
    calls/
      screens/
    chats/
      screens/
    communities/
      screens/
    updates/
      screens/
  navigation/           # RootNavigator, stacks, tabs y tipos de rutas
  services/             # API, WebSocket, sync engine, media upload/download
  store/                # Zustand stores globales
```

## Offline-first

La base local vive en `src/database` y usa Expo SQLite. El historial de chats se consulta desde `messages` por `chat_id` y `created_at`, permitiendo renderizar conversaciones aun sin conexion.

La siguiente capa natural es agregar un `sync engine` en `src/services/sync` para consumir WebSockets/Kafka bridge desde el backend, guardar eventos entrantes en SQLite y publicar mensajes con `sync_state = 'pending'` cuando el dispositivo recupere conectividad.
