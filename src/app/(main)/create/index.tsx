import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomBar } from '@/components/ui/BottomBar';
import { PreWrittenScriptCard } from '@/components/affirmation/PreWrittenScriptCard';
import { usePreWrittenScripts } from '@/hooks/usePreWrittenScripts';
import { COLORS } from '@/lib/constants';

export default function CreateChooseMethodScreen() {
  const { scripts } = usePreWrittenScripts();
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  const selectedScript = scripts.find((s) => s.id === selectedScriptId);

  const handleNext = () => {
    if (selectedScript) {
      router.push({
        pathname: '/(main)/create/record',
        params: {
          title: selectedScript.title,
          script: selectedScript.script,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Create." />

      <View style={styles.body}>
        {/* Pre-written scripts */}
        <View style={styles.section}>
          <Text style={styles.label}>Select a script to customize</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={scripts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.scriptList}
            renderItem={({ item }) => (
              <PreWrittenScriptCard
                script={item}
                selected={item.id === selectedScriptId}
                onSelect={() =>
                  setSelectedScriptId(
                    item.id === selectedScriptId ? null : item.id
                  )
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          />
        </View>

        {/* Custom options */}
        <View style={styles.section}>
          <Text style={styles.label}>Custom options</Text>
          <View style={styles.customOptions}>
            <Pressable
              style={styles.optionCard}
              onPress={() => router.push('/(main)/create/custom')}
            >
              <Text style={styles.optionText}>Write your own script</Text>
            </Pressable>
            <Pressable
              style={styles.optionCard}
              onPress={() =>
                router.push({
                  pathname: '/(main)/create/record',
                  params: { title: 'Free Recording', script: '' },
                })
              }
            >
              <Text style={[styles.optionText, styles.optionTextCenter]}>
                Just start talking
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <BottomBar
        onBack={() => router.back()}
        ctaLabel="Next"
        ctaOnPress={handleNext}
        ctaDisabled={!selectedScriptId}
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
    paddingTop: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 25,
  },
  scriptList: {
    paddingHorizontal: 25,
  },
  customOptions: {
    paddingHorizontal: 25,
    gap: 8,
  },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 24,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionTextCenter: {
    textAlign: 'center',
  },
});
