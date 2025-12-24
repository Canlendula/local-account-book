import { View, FlatList, StyleSheet } from 'react-native';
import { Text, useTheme, List, FAB, Dialog, TextInput, SegmentedButtons, IconButton, Portal, Button } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';

type Tag = {
  id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_custom: number;
};

export default function TagsManagerScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [visible, setVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState('expense');

  const fetchTags = async () => {
    const result = await db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY type, id');
    setTags(result);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    
    await db.runAsync(
      'INSERT INTO tags (name, type, icon, color, is_custom) VALUES (?, ?, ?, ?, 1)',
      newTagName, newTagType, 'tag', theme.colors.primary // Default icon/color
    );
    setNewTagName('');
    setVisible(false);
    fetchTags();
  };

  const handleDeleteTag = async (id: number, isCustom: number) => {
    if (!isCustom) {
        // Maybe allow deleting default tags? For now, restrict.
        return; 
    }
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
    fetchTags();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: '分类管理' }} />
      
      <FlatList
        data={tags}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.type === 'expense' ? '支出' : '收入'}
            left={props => <List.Icon {...props} icon={item.icon} color={item.color || theme.colors.primary} />}
            right={props => item.is_custom ? (
                <IconButton icon="delete" onPress={() => handleDeleteTag(item.id, item.is_custom)} />
            ) : null}
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
          <Dialog.Title>添加分类</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
                value={newTagType}
                onValueChange={setNewTagType}
                buttons={[
                    { value: 'expense', label: '支出' },
                    { value: 'income', label: '收入' },
                ]}
                style={{marginBottom: 15}}
            />
            <TextInput
              label="分类名称"
              value={newTagName}
              onChangeText={setNewTagName}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>取消</Button>
            <Button onPress={handleAddTag}>添加</Button>
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
});

