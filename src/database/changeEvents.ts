type DatabaseChangeTopic = 'chats' | 'contacts' | 'messages';
type Listener = () => void;

const listenersByTopic = new Map<DatabaseChangeTopic, Set<Listener>>();

export function subscribeToDatabaseChanges(topic: DatabaseChangeTopic, listener: Listener) {
  const listeners = listenersByTopic.get(topic) ?? new Set<Listener>();
  listeners.add(listener);
  listenersByTopic.set(topic, listeners);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyDatabaseChanged(topics: DatabaseChangeTopic[]) {
  topics.forEach((topic) => {
    listenersByTopic.get(topic)?.forEach((listener) => listener());
  });
}
