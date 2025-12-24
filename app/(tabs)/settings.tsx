import { View, StyleSheet } from 'react-native';
import { List, useTheme, Button, Dialog, Portal, TextInput } from 'react-native-paper';
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

  useEffect(() => {
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
