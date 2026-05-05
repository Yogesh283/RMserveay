import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Text } from 'react-native';
import { colors, radii, space } from '../theme';

type Props = TextInputProps & {
    label?: string;
};

export function Input({ label, style, ...props }: Props) {
    return (
        <View style={styles.wrap}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor="rgba(148,163,184,0.65)"
                style={[styles.input, style]}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: space(2),
    },
    label: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: space(1),
        textTransform: 'uppercase',
    },
    input: {
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgDeep,
        paddingHorizontal: space(2),
        paddingVertical: space(1.75),
        color: colors.text,
        fontSize: 15,
    },
});
