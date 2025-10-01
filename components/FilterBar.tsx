// components/FilterBar.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS = ['All', 'My Events', 'Upcoming', 'Past', 'Online', 'In-person'] as const;
export type FilterOption = typeof OPTIONS[number];

export default function FilterBar({
  value,
  onChange,
}: { value: FilterOption; onChange: (v: FilterOption) => void }) {
  return (
    <View style={styles.row}>
      {OPTIONS.map(opt => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={[styles.chip, value === opt && styles.chipActive]}
        >
          <Text style={[styles.label, value === opt && styles.labelActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  label: { color: '#111', fontFamily: 'Baloo2-SemiBold' },
  labelActive: { color: '#fff' },
});
