import dayjs from 'dayjs';
import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, RadioButton, SegmentedButtons, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';

type Tag = {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: string;
};

const CURRENCY_OPTIONS = ['CNY', 'USD'];

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
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);

  // 从settings读取默认币种
  useEffect(() => {
    const loadDefaultCurrency = async () => {
      const res = await db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', 'defaultCurrency');
      if (res && res.value) {
        setCurrency(res.value);
      }
    };
    loadDefaultCurrency();
  }, []);

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
    <Stack.Screen options={{ title: '记一笔' }} />
      
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
                style={styles.input}
                autoFocus
                left={
                    <TextInput.Icon 
                        icon={() => (
                            <Pressable 
                                onPress={() => setShowCurrencyDialog(true)}
                                style={styles.currencyPressable}
                            >
                                <Text variant="labelLarge" style={{color: theme.colors.primary}}>{currency}</Text>
                                <Icon source="menu-down" size={12} color={theme.colors.primary} />
                            </Pressable>
                        )}
                    />
                }
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

      <Portal>
        <Dialog visible={showCurrencyDialog} onDismiss={() => setShowCurrencyDialog(false)}>
          <Dialog.Title>选择币种</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={v => { setCurrency(v); setShowCurrencyDialog(false); }} value={currency}>
              {CURRENCY_OPTIONS.map(c => (
                <RadioButton.Item key={c} label={c} value={c} />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
        </Dialog>
      </Portal>
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
  currencyPressable: {
    flexDirection: 'row',
    alignItems: 'center',
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
