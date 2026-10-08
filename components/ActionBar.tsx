import { Pressable, StyleSheet, Text, View } from 'react-native';

type ActionBarProps = {
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
  canClear: boolean;
};

export function ActionBar({ onSave, onClear, saving, canClear }: ActionBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        style={({ pressed }) => [styles.save, (saving || pressed) && styles.pressed]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.clear, !canClear && styles.disabled, pressed && canClear && styles.pressed]}
        onPress={onClear}
        disabled={!canClear}
      >
        <Text style={[styles.clearText, !canClear && styles.clearTextDisabled]}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  save: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clear: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  clearTextDisabled: {
    color: '#94a3b8',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    backgroundColor: '#f8fafc',
  },
});
