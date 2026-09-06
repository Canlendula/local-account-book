import DateRangePicker from '@/components/DateRangePicker';
import TagFilterDropdown from '@/components/TagFilterDropdown';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PieChart } from "react-native-gifted-charts";
import { ActivityIndicator, Button, IconButton, Text, useTheme } from 'react-native-paper';
import MiniToggle from '@/components/MiniToggle';
import { buildStatisticsQuery, EXCHANGE_RATE_KEY, parseExchangeRate, AGGREGATE_CURRENCY_KEY, AggregateCurrency, parseAggregateCurrency } from '@/db/statistics';

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
  const router = useRouter();
  const requestId = useRef(0);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');


  // 日期模式：滑动窗口 或 自然月
  const [dateMode, setDateMode] = useState<'sliding' | 'monthly'>('sliding');
  
  // 滑动窗口模式使用的日期
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  // 自然月模式使用的月份
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 根据模式计算实际使用的日期范围
  const effectiveStartDate = dateMode === 'monthly'
    ? dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD')
    : startDate;
  const effectiveEndDate = dateMode === 'monthly'
    ? dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD')
    : endDate;
  
  // Pie Data State
  const [pieData, setPieData] = useState<ChartData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Filters
  const [currency, setCurrency] = useState('CNY');
  const isAggregate = currency === 'aggregate';
  const [aggregateCurrency, setAggregateCurrency] = useState<AggregateCurrency>('CNY');
  const displayCurrency = isAggregate ? aggregateCurrency : currency;
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
    const id = ++requestId.current;
    setLoading(true);
    setLoadError('');
    try {
      const rateSetting = await db.getFirstAsync<{value: string}>(
        'SELECT value FROM settings WHERE key = ?', EXCHANGE_RATE_KEY
      );
      const directionSetting = await db.getFirstAsync<{value: string}>(
        'SELECT value FROM settings WHERE key = ?', AGGREGATE_CURRENCY_KEY
      );
      const direction = parseAggregateCurrency(directionSetting?.value);
      const rate = parseExchangeRate(rateSetting?.value);
      const currenciesResult = await db.getAllAsync<{currency: string}>(
        'SELECT DISTINCT currency FROM transactions WHERE date(date) BETWEEN date(?) AND date(?) ORDER BY currency',
        [effectiveStartDate, effectiveEndDate]
      );
      if (id !== requestId.current) return;
      setExchangeRate(rate);
      setAggregateCurrency(direction);
      setAvailableCurrencies(Array.from(new Set(['CNY', 'USD', ...currenciesResult.map(c => c.currency)])));
      if (isAggregate && rate === null) {
        setPieData([]);
        setTotalAmount(0);
        return;
      }
      const { sql, params } = buildStatisticsQuery({
        currency, exchangeRate: rate, aggregateCurrency: direction, txType,
        startDate: effectiveStartDate, endDate: effectiveEndDate, tagIds: selectedTagIds,
      });
      const result = await db.getAllAsync<{total: number, tagName: string, color: string, tagId: number}>(sql, params);

      if (id !== requestId.current) return;
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
      if (id === requestId.current) {
        setLoadError('统计加载失败，请重试');
        setPieData([]);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTags();
      fetchData();
      return () => { requestId.current += 1; };
    }, [effectiveStartDate, effectiveEndDate, currency, txType, selectedTagIds])
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 日期导航区域 */}
      <View style={styles.dateNav}>
        <IconButton icon="chevron-left" onPress={handlePrevious} size={20} style={styles.navButton} />
        <TouchableOpacity 
          onPress={() => dateMode === 'sliding' && setShowDatePicker(true)}
          disabled={dateMode === 'monthly'}
        >
          <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
            {getDateDisplayText()}
          </Text>
        </TouchableOpacity>
        <IconButton icon="chevron-right" onPress={handleNext} size={20} style={styles.navButton} />
      </View>

      <View style={[styles.filterCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.filtersRow}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>统计口径</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <MiniToggle value={currency} onValueChange={setCurrency}
              options={[...availableCurrencies.map(c => ({ value: c, label: c })), { value: 'aggregate', label: '聚合' }]} />
          </ScrollView>
        </View>
        {isAggregate && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 14, lineHeight: 20 }}>
            {exchangeRate === null ? `将 USD 与 CNY 合并，以 ${displayCurrency} 展示` : `折合 ${displayCurrency} · 1 USD = ${exchangeRate} CNY\n仅合计 USD / CNY，所有日期按当前汇率折算`}
          </Text>
        )}
        <View style={[styles.filtersRow, { marginBottom: 0, flexWrap: 'wrap' }]}>
          <MiniToggle value={dateMode}
            onValueChange={value => setDateMode(value as 'sliding' | 'monthly')}
            options={[{ value: 'sliding', label: '滑动' }, { value: 'monthly', label: '月份' }]} />
          <MiniToggle value={txType} onValueChange={setTxType}
            options={[{ value: 'expense', label: '支出' }, { value: 'income', label: '收入' }]} />
        </View>
      </View>

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
      ) : loadError ? (
        <View style={styles.emptyContainer}>
          <Text>{loadError}</Text>
          <Button onPress={fetchData}>重试</Button>
        </View>
      ) : isAggregate && exchangeRate === null ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="swap-horizontal" size={32} iconColor={theme.colors.primary} />
          <Text variant="titleMedium">设置汇率，查看聚合统计</Text>
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>{aggregateCurrency === 'CNY' ? '将美元折算为人民币后合计' : '将人民币折算为美元后合计'}</Text>
          <Button mode="contained-tonal" style={{ marginTop: 20 }} onPress={() => router.push('/settings')}>去设置汇率</Button>
        </View>
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
                        <Text variant="titleMedium" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 112 }}>{totalAmount.toFixed(2)}</Text>
                        <Text variant="labelSmall">{isAggregate ? `折合 ${displayCurrency}` : displayCurrency}</Text>
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
                       <Text>{item.value.toFixed(2)} {displayCurrency}</Text>
                   </View>
               ))}
           </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
            <Text>该区间无{txType === 'expense' ? '支出' : '收入'}数据</Text>
        </View>
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  navButton: {
    margin: 0,
  },
  filterCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  filtersRow: {
    justifyContent: 'space-between',
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
