import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ScannedItemRow } from './ScannedItemRow';
import type { QrItem } from '../types/qrItem';

type ScannedListProps = {
  items: QrItem[];
};

export function ScannedList({ items }: ScannedListProps) {
  const listRef = useRef<FlatList<QrItem>>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [items.length]);

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <ScannedItemRow item={item} highlight={index === items.length - 1} />
      )}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.empty}>Point the camera at a QR code. Each unique value is added once.</Text>
        </View>
      }
      contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  empty: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
