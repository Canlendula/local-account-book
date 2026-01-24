import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Dialog, FAB, Icon, IconButton, List, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import MiniToggle from '@/components/MiniToggle';

type Tag = {
  id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_custom: number;
};

// 可选的图标列表
const AVAILABLE_ICONS = [
  'food', 'food-apple', 'food-fork-drink', 'coffee',
  'cart', 'shopping', 'bag-personal', 'basket',
  'train', 'car', 'bus', 'airplane', 'bike', 'subway',
  'home', 'home-city', 'bed', 'sofa',
  'movie', 'gamepad-variant', 'music', 'guitar-acoustic', 'headphones',
  'power', 'water', 'flash', 'fire', 'wifi',
  'cash', 'currency-usd', 'wallet', 'credit-card', 'bank',
  'medical-bag', 'hospital-box', 'pill', 'heart-pulse',
  'school', 'book-open-variant', 'pencil', 'notebook',
  'dumbbell', 'basketball', 'soccer', 'run',
  'gift', 'party-popper', 'cake',
  'phone', 'laptop', 'television', 'camera',
  'paw', 'dog', 'cat',
  'tshirt-crew', 'hanger', 'shoe-heel',
  'baby-carriage', 'human-child',
  'dots-horizontal', 'tag', 'star', 'heart',
];

// 可选的颜色列表
const AVAILABLE_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
  '#795548', '#9E9E9E', '#607D8B', '#000000',
];

export default function TagsManagerScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [visible, setVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState('expense');
  const [newTagIcon, setNewTagIcon] = useState('tag');
  const [newTagColor, setNewTagColor] = useState('#607D8B');

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
      newTagName, newTagType, newTagIcon, newTagColor
    );
    // 重置状态
    setNewTagName('');
    setNewTagType('expense');
    setNewTagIcon('tag');
    setNewTagColor('#607D8B');
    setVisible(false);
    fetchTags();
  };
  
  const handleCloseDialog = () => {
    setNewTagName('');
    setNewTagType('expense');
    setNewTagIcon('tag');
    setNewTagColor('#607D8B');
    setVisible(false);
  };

  const handleDeleteTag = async (id: number, isCustom: number) => {
    if (!isCustom) {
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
        <Dialog visible={visible} onDismiss={handleCloseDialog} style={styles.dialog}>
          <Dialog.Title>添加分类</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <View style={styles.toggleRow}>
                  <MiniToggle
                    value={newTagType}
                    onValueChange={setNewTagType}
                    options={[
                      { value: 'expense', label: '支出' },
                      { value: 'income', label: '收入' },
                    ]}
                  />
                </View>
                <TextInput
                  label="分类名称"
                  value={newTagName}
                  onChangeText={setNewTagName}
                  mode="outlined"
                  style={{marginBottom: 15}}
                />
                
                {/* 图标预览 */}
                <View style={styles.previewContainer}>
                  <View style={[styles.previewIcon, { backgroundColor: newTagColor }]}>
                    <Icon source={newTagIcon} size={32} color="white" />
                  </View>
                  <Text variant="bodyMedium" style={{marginLeft: 12}}>{newTagName || '分类名称'}</Text>
                </View>
                
                {/* 图标选择 */}
                <Text variant="labelLarge" style={styles.sectionTitle}>选择图标</Text>
                <View style={styles.iconGrid}>
                  {AVAILABLE_ICONS.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconItem,
                        newTagIcon === icon && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => setNewTagIcon(icon)}
                    >
                      <Icon source={icon} size={24} color={newTagIcon === icon ? theme.colors.primary : theme.colors.onSurface} />
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* 颜色选择 */}
                <Text variant="labelLarge" style={styles.sectionTitle}>选择颜色</Text>
                <View style={styles.colorGrid}>
                  {AVAILABLE_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorItem,
                        { backgroundColor: color },
                        newTagColor === color && styles.colorItemSelected
                      ]}
                      onPress={() => setNewTagColor(color)}
                    >
                      {newTagColor === color && (
                        <Icon source="check" size={18} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={handleCloseDialog}>取消</Button>
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
  dialog: {
    maxHeight: '80%',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  toggleRow: {
    alignItems: 'center',
    marginBottom: 15,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

