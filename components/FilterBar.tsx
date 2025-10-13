import React from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';

const OPTIONS = [
   'All', 
  'My Events', 
  'Upcoming', 
  'Past', 
  'Online', 
  'In-person', 
  "Workshop",
  "Academic",
  "Sports",
  "Cultural",
  "Welfare",
  "FOC",
  "Residential Affairs"
] as const;

export type FilterOption = typeof OPTIONS[number];

export default function FilterBar({
  value,
  onChange,
}: { 
  value: FilterOption; 
  onChange: (v: FilterOption) => void 
}) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.filterButton,
            value === option && styles.selectedButton
          ]}
          onPress={() => onChange(option)}
        >
          <Text 
            style={[
              styles.filterText,
              value === option && styles.selectedText
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: '#0055FE',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Baloo2-Medium',
    color: '#666',
  },
  selectedText: {
    color: '#ffffffff',
    fontFamily: 'Baloo2-SemiBold',
  },
});