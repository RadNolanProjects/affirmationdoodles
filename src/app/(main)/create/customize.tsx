import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomBar } from '@/components/ui/BottomBar';
import { COLORS } from '@/lib/constants';

export default function CustomizeScriptScreen() {
  const { title, script } = useLocalSearchParams<{
    title: string;
    script: string;
  }>();
  const [editedScript, setEditedScript] = useState(script ?? '');

  const handleNext = () => {
    router.push({
      pathname: '/(main)/create/record',
      params: { title: title ?? 'My Affirmation', script: editedScript },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Affirm." subtitle="Customize your script" />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            value={editedScript}
            onChangeText={setEditedScript}
            multiline
            textAlignVertical="top"
            placeholder="Edit your affirmation..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </ScrollView>

      <BottomBar
        onBack={() => router.back()}
        ctaLabel="Next"
        ctaOnPress={handleNext}
        ctaDisabled={!editedScript.trim()}
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
    paddingHorizontal: 25,
    paddingTop: 16,
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    minHeight: 400,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    flex: 1,
  },
});
