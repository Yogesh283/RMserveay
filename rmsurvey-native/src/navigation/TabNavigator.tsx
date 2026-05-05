/**
 * Bottom tabs (production): install
 *   @react-navigation/native @react-navigation/bottom-tabs
 * then replace stubs with real screens — mirror web routes:
 *   /survey/dashboard | /survey/surveys | /survey/wallet | /survey/team | /survey/more
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function RootTabsPlaceholder() {
    return (
        <View style={styles.box}>
            <Text style={styles.t}>Install React Navigation to enable RootTabs</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    box: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
    t: { color: colors.muted, textAlign: 'center' },
});
