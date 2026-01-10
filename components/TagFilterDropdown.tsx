import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, Dialog, Divider, Icon, Portal, Text, useTheme } from 'react-native-paper';

type Tag = {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
};

type TagFilterDropdownProps = {
  tags: Tag[];
  selectedTagIds: number[];
  onSelectionChange: (tagIds: number[]) => void;
  filterByType?: string; // 可选：按类型过滤标签
  placeholder?: string;
};

export default function TagFilterDropdown({
  tags,
  selectedTagIds,
  onSelectionChange,
  filterByType,
  placeholder = '筛选分类',
}: TagFilterDropdownProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  
  // 根据类型过滤标签
  const filteredTags = filterByType 
    ? tags.filter(tag => tag.type === filterByType)
    : tags;
  
  // 获取选中的标签名称用于显示
  const getDisplayText = () => {
    if (selectedTagIds.length === 0) {
      return '全部分类';
    }
    const selectedTags = filteredTags.filter(tag => selectedTagIds.includes(tag.id));
    if (selectedTags.length === 1) {
      return selectedTags[0].name;
    }
    return `已选 ${selectedTags.length} 项`;
  };

  const handleTagToggle = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([]);
  };

  const handleSelectAllFiltered = () => {
    onSelectionChange(filteredTags.map(tag => tag.id));
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          { 
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: selectedTagIds.length > 0 ? theme.colors.primary : theme.colors.outline,
          }
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Icon 
          source="filter-variant" 
          size={20} 
          color={selectedTagIds.length > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant} 
        />
        <Text 
          style={[
            styles.dropdownText,
            { color: selectedTagIds.length > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }
          ]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
        <Icon 
          source="chevron-down" 
          size={20} 
          color={selectedTagIds.length > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant} 
        />
      </TouchableOpacity>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            <View style={styles.dialogTitleRow}>
              <Text variant="titleLarge">选择分类</Text>
              {selectedTagIds.length > 0 && (
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  已选 {selectedTagIds.length} 项
                </Text>
              )}
            </View>
          </Dialog.Title>
          
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              {/* 全部选项 */}
              <TouchableOpacity
                style={[
                  styles.tagItem,
                  selectedTagIds.length === 0 && { backgroundColor: theme.colors.primaryContainer }
                ]}
                onPress={handleSelectAll}
                activeOpacity={0.7}
              >
                <View style={[styles.tagIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Icon source="select-all" size={22} color={theme.colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.tagName, { flex: 1 }]}>全部分类</Text>
                <Checkbox
                  status={selectedTagIds.length === 0 ? 'checked' : 'unchecked'}
                  onPress={handleSelectAll}
                />
              </TouchableOpacity>
              
              <Divider style={styles.divider} />
              
              {/* 标签列表 */}
              {filteredTags.map(tag => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagItem,
                    selectedTagIds.includes(tag.id) && { backgroundColor: theme.colors.primaryContainer }
                  ]}
                  onPress={() => handleTagToggle(tag.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tagIconContainer, { backgroundColor: tag.color || theme.colors.primary }]}>
                    <Icon source={tag.icon || 'tag'} size={20} color="white" />
                  </View>
                  <Text style={[styles.tagName, { flex: 1 }]}>{tag.name}</Text>
                  <Checkbox
                    status={selectedTagIds.includes(tag.id) ? 'checked' : 'unchecked'}
                    onPress={() => handleTagToggle(tag.id)}
                  />
                </TouchableOpacity>
              ))}
              
              {filteredTags.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>暂无分类</Text>
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              mode="text" 
              onPress={handleSelectAllFiltered}
              disabled={filteredTags.length === 0}
            >
              全选
            </Button>
            <Button 
              mode="text" 
              onPress={handleSelectAll}
            >
              清除
            </Button>
            <Button mode="contained" onPress={() => setVisible(false)}>
              确定
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    gap: 8,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 120,
  },
  dialog: {
    maxHeight: '70%',
  },
  dialogTitle: {
    paddingBottom: 0,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: 400,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  tagIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagName: {
    fontSize: 15,
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  dialogActions: {
    paddingHorizontal: 16,
    gap: 8,
  },
});

