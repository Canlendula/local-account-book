import { View, StyleSheet, Modal } from 'react-native';
import { Button, Portal, Dialog, Text, TextInput } from 'react-native-paper';
import { useState } from 'react';
import dayjs from 'dayjs';

interface DateRangePickerProps {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: (startDate: string, endDate: string) => void;
    initialStartDate: string;
    initialEndDate: string;
}

export default function DateRangePicker({ visible, onDismiss, onConfirm, initialStartDate, initialEndDate }: DateRangePickerProps) {
    // Simple text input for now as full calendar UI is complex without library
    // Format YYYY-MM-DD
    const [start, setStart] = useState(initialStartDate);
    const [end, setEnd] = useState(initialEndDate);

    const handleConfirm = () => {
        // Basic validation
        if (dayjs(start).isValid() && dayjs(end).isValid()) {
             onConfirm(start, end);
        }
    };

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>选择日期范围</Dialog.Title>
                <Dialog.Content>
                    <TextInput
                        label="开始日期 (YYYY-MM-DD)"
                        value={start}
                        onChangeText={setStart}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="numeric"
                    />
                    <TextInput
                        label="结束日期 (YYYY-MM-DD)"
                        value={end}
                        onChangeText={setEnd}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="numeric"
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>取消</Button>
                    <Button onPress={handleConfirm}>确定</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

const styles = StyleSheet.create({
    input: {
        marginBottom: 10
    }
});

