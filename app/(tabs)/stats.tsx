import DateRangePicker from '@/components/DateRangePicker';
import TagFilterDropdown from '@/components/TagFilterDropdown';
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PieChart } from "react-native-gifted-charts";
import { ActivityIndicator, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

type ChartData = {
  value: number;
  color: string;
  text?: string;
  tagName: string;
  tagId: number;
};

type Tag = {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
};

export default function StatsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const screenWidth = Dimensions.get('window').width;

  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Pie Data State
  const [pieData, setPieData] = useState<ChartData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Filters
  const [currency, setCurrency] = useState('CNY');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['CNY']);
  const [txType, setTxType] = useState('expense'); // 'expense' or 'income'
  
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get available currencies in range
      const currenciesResult = await db.getAllAsync<{currency: string}>(
        `SELECT DISTINCT currency FROM transactions WHERE date(date) BETWEEN date(?) AND date(?)`,
        [startDate, endDate]
      );
      const currencies = currenciesResult.map(c => c.currency);
      setAvailableCurrencies(currencies.length > 0 ? currencies : ['CNY']);
      
      const currentCurrency = currencies.includes(currency) ? currency : (currencies[0] || 'CNY');
      if (currentCurrency !== currency) setCurrency(currentCurrency);

      // 标签类型聚合统计
      // 被删除的tag的记录仍然需要被统计（归类到"其他"）
      let sql = `
        SELECT sum(t.amount) as total, 
               COALESCE(tg.name, '其他') as tagName, 
               COALESCE(tg.color, '#607D8B') as color, 
               COALESCE(tg.id, -1) as tagId
        FROM transactions t
        LEFT JOIN tags tg ON t.tag_id = tg.id
        WHERE t.type = ? 
          AND t.currency = ?
          AND date(t.date) BETWEEN date(?) AND date(?)
      `;
      const params: (string | number)[] = [txType, currentCurrency, startDate, endDate];
      
      // 添加标签筛选条件
      if (selectedTagIds.length > 0) {
        const placeholders = selectedTagIds.map(() => '?').join(',');
        sql += ` AND t.tag_id IN (${placeholders})`;
        params.push(...selectedTagIds);
      }
      
      sql += ` GROUP BY COALESCE(tg.id, -1) ORDER BY total DESC`;
      
      const result = await db.getAllAsync<{total: number, tagName: string, color: string, tagId: number}>(sql, params);

      const total = result.reduce((sum, item) => sum + item.total, 0);
      setTotalAmount(total);

      const chartData = result.map(item => ({
        value: item.total,
        color: item.color || theme.colors.primary,
        text: total > 0 ? `${((item.total / total) * 100).toFixed(0)}%` : '0%',
        tagName: item.tagName,
        tagId: item.tagId
      }));
      setPieData(chartData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTags();
      fetchData();
    }, [startDate, endDate, currency, txType, selectedTagIds])
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        {/* <Text variant="headlineSmall" style={{marginBottom: 10}}>收支统计</Text> */}
        
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <IconButton icon="chevron-left" onPress={() => {
                setStartDate(dayjs(startDate).subtract(1, 'month').format('YYYY-MM-DD'));
                setEndDate(dayjs(endDate).subtract(1, 'month').format('YYYY-MM-DD'));
            }} />
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <View style={{alignItems: 'center'}}>
                    <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                    {startDate} ~ {endDate}
                    </Text>
                     <Text variant="labelSmall" style={{color: theme.colors.primary}}>点击修改</Text>
                </View>
            </TouchableOpacity>
            <IconButton icon="chevron-right" onPress={() => {
                setStartDate(dayjs(startDate).add(1, 'month').format('YYYY-MM-DD'));
                setEndDate(dayjs(endDate).add(1, 'month').format('YYYY-MM-DD'));
            }} />
        </View>
      </View>

      <SegmentedButtons
          value={txType}
          onValueChange={setTxType}
          buttons={[
            { value: 'expense', label: '支出统计' },
            { value: 'income', label: '收入统计' },
          ]}
          style={styles.typeSelector}
      />

      {availableCurrencies.length > 1 && (
        <SegmentedButtons
          value={currency}
          onValueChange={setCurrency}
          buttons={availableCurrencies.map(c => ({ value: c, label: c }))}
          style={styles.currencySelector}
        />
      )}

      {/* 标签筛选 */}
      <View style={styles.filterRow}>
        <TagFilterDropdown
          tags={tags}
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
          filterByType={txType}
        />
      </View>

      {loading ? (
        <ActivityIndicator animating={true} style={{marginTop: 50}} />
      ) : pieData.length > 0 ? (
        <View style={styles.chartContainer}>
           <View style={{alignItems: 'center'}}>
            <PieChart
                data={pieData}
                donut
                showText
                textColor="white"
                radius={120}
                innerRadius={60}
                centerLabelComponent={() => {
                return (
                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                        <Text variant="labelMedium">{txType === 'expense' ? '总支出' : '总收入'}</Text>
                        <Text variant="titleMedium">{totalAmount.toFixed(2)}</Text>
                    </View>
                );
                }}
            />
           </View>
           
           <View style={styles.legendContainer}>
               {pieData.map((item, index) => (
                   <View key={index} style={styles.legendItem}>
                       <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                       <Text style={{flex: 1}}>{item.tagName}</Text>
                       <Text>{item.value.toFixed(2)}</Text>
                   </View>
               ))}
           </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
            <Text>该区间无{txType === 'expense' ? '支出' : '收入'}数据</Text>
        </View>
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 10,
  },
  typeSelector: {
      marginBottom: 20
  },
  currencySelector: {
    marginBottom: 20,
  },
  filterRow: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    paddingBottom: 50
  },
  legendContainer: {
    marginTop: 30,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center',
  }
});
