import { View, ScrollView, StyleSheet } from 'react-native';
import { List, useTheme, Button, Dialog, Portal, TextInput, Text, HelperText, SegmentedButtons } from 'react-native-paper';
import { EXCHANGE_RATE_KEY, parseExchangeRate, AGGREGATE_CURRENCY_KEY, AggregateCurrency, parseAggregateCurrency } from '@/db/statistics';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  
  const [currency, setCurrency] = useState('CNY');
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [tempCurrency, setTempCurrency] = useState('CNY');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [rateError, setRateError] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [aggregateCurrency, setAggregateCurrency] = useState<AggregateCurrency>('CNY');
  const [savingDirection, setSavingDirection] = useState(false);
  const [directionError, setDirectionError] = useState('');

  useEffect(() => {
    db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', AGGREGATE_CURRENCY_KEY)
      .then(res => setAggregateCurrency(parseAggregateCurrency(res?.value)))
      .catch(() => setDirectionError('聚合方向读取失败，请重新选择'));
    db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', EXCHANGE_RATE_KEY)
      .then(res => setExchangeRate(parseExchangeRate(res?.value)))
      .catch(() => setRateError('汇率读取失败，请重新设置'));
    db.getFirstAsync<{value: string}>('SELECT value FROM settings WHERE key = ?', 'defaultCurrency')
      .then(res => {
          if (res) {
            setCurrency(res.value);
            setTempCurrency(res.value);
          }
      });
  }, []);

  const saveCurrency = async () => {
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'defaultCurrency', tempCurrency);
    setCurrency(tempCurrency);
    setShowCurrencyDialog(false);
  };

  const saveDirection = async (value: string) => {
    if (savingDirection) return;
    const next = parseAggregateCurrency(value);
    setSavingDirection(true);
    setDirectionError('');
    try {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', AGGREGATE_CURRENCY_KEY, next);
      setAggregateCurrency(next);
    } catch {
      setDirectionError('保存失败，请重新选择');
    } finally {
      setSavingDirection(false);
    }
  };

  const saveRate = async () => {
    const rate = parseExchangeRate(rateInput);
    if (rate === null) {
      setRateError('请输入大于 0 的有效数字，例如 7.20');
      return;
    }
    setSavingRate(true);
    try {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', EXCHANGE_RATE_KEY, String(rate));
      setExchangeRate(rate);
      setShowRateDialog(false);
    } catch {
      setRateError('保存失败，请重试');
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 24 }}>
      <List.Section>
        <List.Subheader>通用</List.Subheader>
        <List.Item
          title="默认币种"
          description={currency}
          left={props => <List.Icon {...props} icon="currency-usd" />}
          onPress={() => setShowCurrencyDialog(true)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>统计偏好</List.Subheader>
        <View style={[styles.directionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Text variant="titleSmall">聚合显示币种</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, marginBottom: 16, lineHeight: 20 }}>
            选择合并统计时的金额单位，切换后自动保存。
          </Text>
          <SegmentedButtons
            value={aggregateCurrency}
            onValueChange={saveDirection}
            buttons={[
              { value: 'CNY', label: '人民币 CNY', showSelectedCheck: true, disabled: savingDirection },
              { value: 'USD', label: '美元 USD', showSelectedCheck: true, disabled: savingDirection },
            ]}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 20 }}>
            {savingDirection ? '正在保存…' : aggregateCurrency === 'CNY' ? 'USD → CNY · 美元折算为人民币后合计' : 'CNY → USD · 人民币折算为美元后合计'}
          </Text>
          {!!directionError && <HelperText type="error">{directionError}</HelperText>}
        </View>
        <List.Item
          title="美元兑人民币汇率"
          description={exchangeRate === null ? '未设置 · 设置后可查看聚合统计' : `1 USD = ${exchangeRate} CNY`}
          left={props => <List.Icon {...props} icon="swap-horizontal" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            setRateInput(exchangeRate === null ? '' : String(exchangeRate));
            setRateError('');
            setShowRateDialog(true);
          }}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>管理</List.Subheader>
        <List.Item
            title="分类管理"
            description="添加或编辑自定义分类"
            left={props => <List.Icon {...props} icon="tag-multiple" />}
            onPress={() => router.push('/tags-manager')}
        />
        <List.Item
            title="固定支出"
            description="设置每月固定发生的支出"
            left={props => <List.Icon {...props} icon="calendar-clock" />}
            onPress={() => router.push('/recurring-manager')}
        />
      </List.Section>

      <Portal>
        <Dialog visible={showRateDialog} onDismiss={() => !savingRate && setShowRateDialog(false)}>
          <Dialog.Title>设置折算汇率</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
              两种聚合方向共用此汇率。折合 USD 时自动反向换算。所有日期按当前汇率计算，原始账目不变，设置仅保存在本机。
            </Text>
            <TextInput
              label="1 USD 等于多少 CNY"
              placeholder="例如 7.20"
              value={rateInput}
              onChangeText={value => { setRateInput(value); setRateError(''); }}
              keyboardType="decimal-pad"
              mode="outlined"
              error={!!rateError}
              disabled={savingRate}
              right={<TextInput.Affix text="CNY" />}
            />
            <HelperText type="error" visible={!!rateError}>{rateError}</HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={savingRate} onPress={() => setShowRateDialog(false)}>取消</Button>
            <Button loading={savingRate} disabled={savingRate} onPress={saveRate}>保存</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showCurrencyDialog} onDismiss={() => setShowCurrencyDialog(false)}>
          <Dialog.Title>设置默认币种</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="币种代码 (e.g. CNY, USD)"
              value={tempCurrency}
              onChangeText={setTempCurrency}
              autoCapitalize="characters"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCurrencyDialog(false)}>取消</Button>
            <Button onPress={saveCurrency}>确定</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  directionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  container: {
    flex: 1,
  },
});
