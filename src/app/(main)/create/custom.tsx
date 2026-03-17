import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomBar } from '@/components/ui/BottomBar';
import { COLORS, FONTS } from '@/lib/constants';

export default function CustomScriptScreen() {
  const { ftue } = useLocalSearchParams<{ ftue?: string }>();
  const [name, setName] = useState('');
  const [script, setScript] = useState('');

  const handleSave = () => {
    const title = name.trim() || 'My Affirmation';

    router.push({
      pathname: '/(main)/create/record',
      params: { title, script, ...(ftue === '1' && { ftue: '1' }) },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Affirm." />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder={'\u201CConfidence boost\u201D or \u201CDaily inspo\u201D'}
              placeholderTextColor={`${COLORS.text}80`}
            />
          </View>
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Write an affirmation for yourself</Text>
          <View style={[styles.inputCard, { flex: 1, minHeight: 350 }]}>
            <TextInput
              style={styles.textInput}
              value={script}
              onChangeText={setScript}
              multiline
              textAlignVertical="top"
              placeholder="Tap to start typing"
              placeholderTextColor={`${COLORS.text}80`}
              autoFocus
            />
          </View>
        </View>
      </ScrollView>

      <BottomBar
        onBack={() => router.back()}
        ctaLabel="Save"
        ctaOnPress={handleSave}
        ctaDisabled={!script.trim()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 31,
    paddingTop: 24,
    gap: 24,
    flex: 1,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    lineHeight: 13 * 0.86,
    color: COLORS.text,
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    padding: 24,
    shadowColor: '#B2B2B2',
    shadowOffset: { width: 10, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 4,
  },
  nameInput: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: COLORS.text,
  },
  textInput: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: COLORS.text,
    flex: 1,
  },
});
