import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, space } from '../theme';

type Variant = 'gold' | 'outline' | 'ghost' | 'purple';

type Props = {
    title: string;
    onPress: () => void;
    variant?: Variant;
    disabled?: boolean;
    style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'gold', disabled, style }: Props) {
    const v =
        variant === 'outline'
            ? styles.outline
            : variant === 'purple'
              ? styles.purple
              : variant === 'ghost'
                ? styles.ghost
                : styles.gold;

    return (
        <Pressable onPress={onPress} disabled={disabled} style={[styles.hit, v, disabled && styles.disabled, style]}>
            <Text
                style={[
                    styles.text,
                    variant === 'gold' && styles.goldText,
                    variant === 'purple' && styles.purpleText,
                ]}
            >
                {title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    hit: {
        borderRadius: radii.xl,
        paddingVertical: space(1.75),
        paddingHorizontal: space(2.5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    gold: {
        backgroundColor: colors.goldMid,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: colors.goldMid,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    outline: {
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.45)',
        backgroundColor: 'rgba(212,175,55,0.1)',
    },
    purple: {
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.35)',
        backgroundColor: 'rgba(139,92,246,0.14)',
    },
    ghost: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    text: {
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.25,
        color: colors.text,
    },
    goldText: {
        color: colors.bg,
    },
    purpleText: {
        color: '#ddd6fe',
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.45,
    },
});
