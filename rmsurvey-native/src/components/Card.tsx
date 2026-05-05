import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, space } from '../theme';

type Variant = 'default' | 'gold' | 'inset';

type Props = PropsWithChildren<{
    variant?: Variant;
    style?: ViewStyle;
    padded?: boolean;
}>;

export function Card({ children, variant = 'default', style, padded = true }: Props) {
    return (
        <View style={[styles.base, variants[variant], padded && styles.pad, style]}>{children}</View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: radii.xl,
        borderWidth: 1,
    },
    pad: {
        padding: space(2),
    },
});

const variants = StyleSheet.create({
    default: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    gold: {
        backgroundColor: 'rgba(212,175,55,0.08)',
        borderColor: 'rgba(212,175,55,0.35)',
        shadowColor: colors.goldMid,
        shadowOpacity: 0.25,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    inset: {
        backgroundColor: colors.bgDeep,
        borderColor: 'rgba(255,255,255,0.06)',
    },
});
