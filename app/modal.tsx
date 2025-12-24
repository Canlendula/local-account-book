import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, useTheme, TouchableRipple, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

type Tag = {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: string;
};

export default function ModalScreen() {
  const router = useRouter();
  const theme = useTheme();
  const db = useSQLiteContext();
  
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [currency, setCurrency] = useState('CNY'); 

  useEffect(() => {
    // Load Tags based on type
    const loadTags = async () => {
      const result = await db.getAllAsync<Tag>('SELECT * FROM tags WHERE type = ?', [type]);
      setTags(result);
      // Reset selected tag or pick first?
      if (result.length > 0) {
        setSelectedTagId(result[0].id);
      } else {
        setSelectedTagId(null);
      }
    };
    loadTags();
  }, [type]);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
        // Maybe show error
        return;
    }
    if (!selectedTagId) return;

    try {
        await db.runAsync(
            'INSERT INTO transactions (amount, currency, date, tag_id, type, note) VALUES (?, ?, ?, ?, ?, ?)',
            Number(amount), currency, date, selectedTagId, type, note
        );
        router.back();
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <SegmentedButtons
            value={type}
            onValueChange={setType}
            buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
            ]}
            style={styles.segmentedButton}
        />

        <View style={styles.inputContainer}>
            <TextInput
                mode="outlined"
                label="金额"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                left={<TextInput.Affix text={currency} />}
                style={styles.input}
                autoFocus
            />
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>分类</Text>
        <View style={styles.tagsContainer}>
            {tags.map(tag => (
                <TouchableRipple 
                    key={tag.id} 
                    onPress={() => setSelectedTagId(tag.id)}
                    style={[
                        styles.tagItem, 
                        selectedTagId === tag.id && { backgroundColor: theme.colors.secondaryContainer, borderRadius: 8 }
                    ]}
                >
                    <View style={{alignItems: 'center', padding: 8}}>
                        <View style={[styles.tagIcon, { backgroundColor: tag.color }]}>
                             <Icon source={tag.icon} size={24} color="white" />
                        </View>
                        <Text variant="labelSmall" style={{marginTop: 4}}>{tag.name}</Text>
                    </View>
                </TouchableRipple>
            ))}
        </View>

        <TextInput
            mode="outlined"
            label="备注 (可选)"
            value={note}
            onChangeText={setNote}
            style={styles.input}
        />
        
        <View style={styles.dateContainer}>
             <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>日期: {dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
        </View>

        <Button mode="contained" onPress={handleSave} style={styles.button}>
            保存
        </Button>
        <Button mode="text" onPress={() => router.back()} style={styles.cancelButton}>
            取消
        </Button>

      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  segmentedButton: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 10,
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagItem: {
    width: '25%', // 4 columns
    alignItems: 'center',
    marginBottom: 10,
  },
  tagIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    marginVertical: 10,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
  },
  cancelButton: {
    marginTop: 10,
  }
});
