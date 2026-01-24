import DateRangePicker from '@/components/DateRangePicker';
import TagFilterDropdown from '@/components/TagFilterDropdown';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, Icon, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

type Transaction = {
  id: number;
  amount: number;
  currency: string;
  date: string;
  tag_id: number;
  type: 'expense' | 'income';
  note: string;
  tagName?: string;
  tagIcon?: string;
  tagColor?: string;
};

type Tag = {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 日期模式：滑动窗口 或 自然月
  const [dateMode, setDateMode] = useState<'sliding' | 'monthly'>('sliding');
  
  // 滑动窗口模式使用的日期
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  // 自然月模式使用的月份
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 根据模式计算实际使用的日期范围
  const effectiveStartDate = dateMode === 'monthly'
    ? dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD')
    : startDate;
  const effectiveEndDate = dateMode === 'monthly'
    ? dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD')
    : endDate;
  
  // 标签筛选
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const fetchTags = async () => {
    try {
      const result = await db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY type, id');
      setTags(result);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let sql = `
        SELECT t.*, tg.name as tagName, tg.icon as tagIcon, tg.color as tagColor 
        FROM transactions t
        LEFT JOIN tags tg ON t.tag_id = tg.id
        WHERE date(t.date) >= date(?) AND date(t.date) <= date(?)
      `;
      const params: (string | number)[] = [effectiveStartDate, effectiveEndDate];
      
      if (selectedTagIds.length > 0) {
        const placeholders = selectedTagIds.map(() => '?').join(',');
        sql += ` AND t.tag_id IN (${placeholders})`;
        params.push(...selectedTagIds);
      }
      
      sql += ` ORDER BY t.date DESC`;
      
      const result = await db.getAllAsync<Transaction>(sql, params);
      setTransactions(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTags();
      fetchTransactions();
    }, [effectiveStartDate, effectiveEndDate, selectedTagIds])
  );

  // 日期导航处理函数
  const handlePrevious = () => {
    if (dateMode === 'monthly') {
      setSelectedMonth(dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM'));
    } else {
      setStartDate(dayjs(startDate).subtract(1, 'month').format('YYYY-MM-DD'));
      setEndDate(dayjs(endDate).subtract(1, 'month').format('YYYY-MM-DD'));
    }
  };

  const handleNext = () => {
    if (dateMode === 'monthly') {
      setSelectedMonth(dayjs(selectedMonth).add(1, 'month').format('YYYY-MM'));
    } else {
      setStartDate(dayjs(startDate).add(1, 'month').format('YYYY-MM-DD'));
      setEndDate(dayjs(endDate).add(1, 'month').format('YYYY-MM-DD'));
    }
  };

  // 获取日期显示文本
  const getDateDisplayText = () => {
    if (dateMode === 'monthly') {
      return dayjs(selectedMonth).format('YYYY年M月');
    }
    return `${startDate} ~ ${endDate}`;
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "确认删除",
      "您确定要删除这条记录吗？",
      [
        { text: "取消", style: "cancel" },
        { 
          text: "删除", 
          style: "destructive", 
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
              fetchTransactions();
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <Card style={styles.card} onLongPress={() => handleDelete(item.id)}>
      <Card.Title
        title={`${item.type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)} ${item.currency}`}
        subtitle={`${dayjs(item.date).format('YYYY-MM-DD HH:mm')} ${item.note ? '· ' + item.note : ''}`}
        titleStyle={{ color: item.type === 'expense' ? theme.colors.error : theme.colors.primary, fontWeight: 'bold' }}
        left={(props) => (
           <View style={[styles.iconContainer, { backgroundColor: item.tagColor || theme.colors.surfaceVariant }]}>
             <Icon source={item.tagIcon || 'help'} size={24} color={'white'} />
           </View>
        )}
        right={(props) => <Chip style={{marginRight: 10}}>{item.tagName || '其他'}</Chip>}
      />
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        {/* 日期模式切换 */}
        <SegmentedButtons
          value={dateMode}
          onValueChange={(value) => setDateMode(value as 'sliding' | 'monthly')}
          buttons={[
            { value: 'sliding', label: '滑动窗口' },
            { value: 'monthly', label: '自然月' },
          ]}
          style={styles.modeSelector}
        />
        
        <View style={styles.dateNavRow}>
          <IconButton icon="chevron-left" onPress={handlePrevious} />
          <TouchableOpacity 
            onPress={() => dateMode === 'sliding' && setShowDatePicker(true)}
            disabled={dateMode === 'monthly'}
          >
              <View style={{alignItems: 'center'}}>
                  <Text variant="labelMedium" style={{color: theme.colors.onSurfaceVariant}}>
                    {dateMode === 'sliding' ? '当前区间 (点击修改)' : '当前月份'}
                  </Text>
                  <Text variant="titleMedium">{getDateDisplayText()}</Text>
              </View>
          </TouchableOpacity>
          <IconButton icon="chevron-right" onPress={handleNext} />
        </View>
      </View>

      {/* 标签筛选 */}
      <View style={styles.filterRow}>
        <TagFilterDropdown
          tags={tags}
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
        />
      </View>

      {loading ? (
        <ActivityIndicator animating={true} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16 }}
          ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <Text variant="bodyLarge" style={{color: theme.colors.onSurfaceVariant}}>暂无账单，点击 + 号记一笔</Text>
              </View>
          }
        />
      )}
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/modal')}
      />

      {dateMode === 'sliding' && (
        <DateRangePicker 
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          initialStartDate={startDate}
          initialEndDate={endDate}
          onConfirm={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setShowDatePicker(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    marginBottom: 8,
    elevation: 2,
  },
  modeSelector: {
    marginBottom: 12,
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  emptyContainer: {
      padding: 30,
      alignItems: 'center'
  }
});
