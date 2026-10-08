import { useEffect, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ScannedItemRow } from './ScannedItemRow';
import type { ScanListItem } from '../types/api';

type ScannedListProps = {
  items: ScanListItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ScannedList({ items, refreshing = false, onRefresh }: ScannedListProps) {
  const listRef = useRef<FlatList<ScanListItem>>(null);

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
      keyExtractor={(item) => item.listKey}
      renderItem={({ item, index }) => (
        <ScannedItemRow item={item} highlight={index === items.length - 1} />
      )}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.empty}>
            Point the camera at a code. The status shows if it synced, is uploading, or is waiting on this phone.
          </Text>
        </View>
      }
      alwaysBounceVertical
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        ) : undefined
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
