import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Text, useTheme, List, FAB, Dialog, TextInput, Button, Portal, IconButton } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';

type Recurring = {
  id: number;
  amount: number;
  currency: string;
  day_of_month: number;
  tag_id: number;
  note: string;
  tagName: string;
};

type Tag = {
    id: number;
    name: string;
};

export default function RecurringManagerScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  
  const [items, setItems] = useState<Recurring[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [visible, setVisible] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const [tagId, setTagId] = useState<number | null>(null);

  const fetchData = async () => {
    const result = await db.getAllAsync<Recurring>(`
        SELECT r.*, t.name as tagName 
        FROM recurring_expenses r
        LEFT JOIN tags t ON r.tag_id = t.id
    `);
    setItems(result);
  };

  const fetchTags = async () => {
      const result = await db.getAllAsync<Tag>('SELECT id, name FROM tags WHERE type="expense"');
      setTags(result);
      if (result.length > 0) setTagId(result[0].id);
  };

  useEffect(() => {
    fetchData();
    fetchTags();
  }, []);

  const handleAdd = async () => {
    if (!amount || !day || !tagId) return;
    const dayNum = parseInt(day);
    if (dayNum < 1 || dayNum > 31) {
        Alert.alert("Error", "Day must be between 1 and 31");
        return;
    }

    await db.runAsync(
      'INSERT INTO recurring_expenses (amount, currency, day_of_month, tag_id, note) VALUES (?, ?, ?, ?, ?)',
      Number(amount), 'CNY', dayNum, tagId, note // Default currency for now
    );
    setAmount('');
    setDay('');
    setNote('');
    setVisible(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?', id);
    fetchData();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: '固定支出设置' }} />
      
      <FlatList
        data={items}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={`每月 ${item.day_of_month} 日: ${item.amount} ${item.currency}`}
            description={`${item.tagName} ${item.note ? '- ' + item.note : ''}`}
            left={props => <List.Icon {...props} icon="calendar-refresh" />}
            right={props => <IconButton icon="delete" onPress={() => handleDelete(item.id)} />}
          />
        )}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setVisible(true)}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>添加固定支出</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="金额"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="每月几号 (1-31)"
              value={day}
              onChangeText={setDay}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
             <TextInput
              label="备注"
              value={note}
              onChangeText={setNote}
              mode="outlined"
              style={styles.input}
            />
            {/* Simple Tag Selection: Just text for now or first available. 
                Ideally a Dropdown. For simplicity, we use the first one or logic is minimal. 
                I will skip complex dropdown logic here and just assume first tag or use ID. 
                Let's add a prompt: "Select Tag ID" is bad. 
                I'll list tags in a horizontal scroll view if needed.
            */}
            <Text variant="labelMedium" style={{marginTop: 10}}>分类: {tags.find(t => t.id === tagId)?.name || 'Select below'}</Text>
            <FlatList 
                horizontal
                data={tags}
                style={{marginTop: 10, maxHeight: 40}}
                renderItem={({item}) => (
                    <Button 
                        mode={tagId === item.id ? 'contained' : 'outlined'} 
                        onPress={() => setTagId(item.id)}
                        style={{marginRight: 8}}
                        compact
                    >
                        {item.name}
                    </Button>
                )}
            />

          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>取消</Button>
            <Button onPress={handleAdd}>添加</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
      marginBottom: 10,
  }
});

