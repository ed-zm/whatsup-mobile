import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  description: string;
};

export function ScreenPlaceholder({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    color: '#667781',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    color: '#111B21',
    fontSize: 22,
    fontWeight: '700',
  },
});
