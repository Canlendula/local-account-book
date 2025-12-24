import DateRangePicker from '@/components/DateRangePicker';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, Icon, IconButton, Text, useTheme } from 'react-native-paper';

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

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const result = await db.getAllAsync<Transaction>(`
        SELECT t.*, tg.name as tagName, tg.icon as tagIcon, tg.color as tagColor 
        FROM transactions t
        LEFT JOIN tags tg ON t.tag_id = tg.id
        WHERE date(t.date) >= date(?) AND date(t.date) <= date(?)
        ORDER BY t.date DESC
      `, [startDate, endDate]);
      setTransactions(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [startDate, endDate])
  );

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
        <IconButton icon="chevron-left" onPress={() => {
            setStartDate(dayjs(startDate).subtract(1, 'month').format('YYYY-MM-DD'));
            setEndDate(dayjs(endDate).subtract(1, 'month').format('YYYY-MM-DD'));
        }} />
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <View style={{alignItems: 'center'}}>
                <Text variant="labelMedium" style={{color: theme.colors.onSurfaceVariant}}>当前区间 (点击修改)</Text>
                <Text variant="titleMedium">{startDate} ~ {endDate}</Text>
            </View>
        </TouchableOpacity>
        <IconButton icon="chevron-right" onPress={() => {
            setStartDate(dayjs(startDate).add(1, 'month').format('YYYY-MM-DD'));
            setEndDate(dayjs(endDate).add(1, 'month').format('YYYY-MM-DD'));
        }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
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
