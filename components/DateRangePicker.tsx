import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { DatePickerModal, registerTranslation } from 'react-native-paper-dates';

registerTranslation('zh', {
    save: '确定',
    selectSingle: '选择日期',
    selectMultiple: '选择日期',
    selectRange: '选择日期范围',
    notAccordingToDateFormat: (inputFormat) => `日期格式应为 ${inputFormat}`,
    mustBeHigherThan: (date) => `必须晚于 ${date}`,
    mustBeLowerThan: (date) => `必须早于 ${date}`,
    mustBeBetween: (startDate, endDate) => `必须在 ${startDate} - ${endDate} 之间`,
    dateIsDisabled: '该日期不可选',
    previous: '上一个',
    next: '下一个',
    typeInDate: '输入日期',
    pickDateFromCalendar: '从日历选择日期',
    close: '关闭',
    hour: '',
    minute: '',
});

interface DateRangePickerProps {
    visible: boolean;
    onDismiss: () => void;
    onConfirm: (startDate: string, endDate: string) => void;
    initialStartDate: string;
    initialEndDate: string;
}

export default function DateRangePicker({ 
    visible, 
    onDismiss, 
    onConfirm, 
    initialStartDate, 
    initialEndDate 
}: DateRangePickerProps) {
    const [range, setRange] = useState<{
        startDate: Date | undefined;
        endDate: Date | undefined;
    }>({
        startDate: dayjs(initialStartDate).toDate(),
        endDate: dayjs(initialEndDate).toDate(),
    });

    useEffect(() => {
        if (visible) {
            setRange({
                startDate: dayjs(initialStartDate).toDate(),
                endDate: dayjs(initialEndDate).toDate(),
            });
        }
    }, [visible, initialStartDate, initialEndDate]);

    const handleConfirm = ({ startDate, endDate }: { startDate: Date | undefined; endDate: Date | undefined }) => {
        if (startDate && endDate) {
            const start = dayjs(startDate).format('YYYY-MM-DD');
            const end = dayjs(endDate).format('YYYY-MM-DD');
            onConfirm(start, end);
        }
    };

    return (
        <DatePickerModal
            locale="zh"
            mode="range"
            visible={visible}
            onDismiss={onDismiss}
            startDate={range.startDate}
            endDate={range.endDate}
            onConfirm={handleConfirm}
            presentationStyle="pageSheet"
            startLabel="开始日期"
            endLabel="结束日期"
            allowEditing={false}
        />
    );
}
