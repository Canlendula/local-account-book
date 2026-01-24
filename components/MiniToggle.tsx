import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type ToggleOption = {
  value: string;
  label: string;
};

type MiniToggleProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ToggleOption[];
  style?: object;
};

const MiniToggle = ({ value, onValueChange, options, style }: MiniToggleProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }, style]}>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isSelected && { backgroundColor: theme.colors.primary },
              index === 0 && styles.firstOption,
              index === options.length - 1 && styles.lastOption,
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.7}
          >
            <Text
              variant="labelMedium"
              style={[
                styles.label,
                { color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    alignSelf: 'flex-start',
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 17,
  },
  firstOption: {
    marginRight: 2,
  },
  lastOption: {
    marginLeft: 2,
  },
  label: {
    fontWeight: '500',
  },
});

export default MiniToggle;
