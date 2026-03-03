import {
  ScrollView,
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

type ScriptItem = {
  title: string;
  script: string;
};

type ScriptCategory = {
  label: string;
  scripts: ScriptItem[];
};

const SCRIPT_CATEGORIES: ScriptCategory[] = [
  {
    label: 'General Positivity',
    scripts: [
      {
        title: 'Bright Side',
        script:
          'I am choosing joy today. I am grateful for the life I am building. I am a magnet for good things. I am deserving of love, laughter, and abundance. I am stronger than I realize. I am making the world a little better just by being in it.',
      },
      {
        title: 'Unshakable',
        script:
          'I am filled with energy and purpose. I am worthy of celebration, not just on big days, but every day. I am letting go of comparison. I am exactly where I need to be. I am a work in progress, and that is a beautiful thing. I am choosing to see the good.',
      },
      {
        title: 'Wide Open',
        script:
          'I am open to the unexpected. I am grateful for the small moments that make life full. I am kind to myself, especially when things feel hard. I am surrounded by more support than I realize. I am allowed to take up space. I am enough, again and again.',
      },
    ],
  },
  {
    label: 'Calming Thoughts',
    scripts: [
      {
        title: 'Still Waters',
        script:
          'I am at peace with what I cannot control. I am safe in this moment. I am allowed to rest without earning it. I am breathing deeply and letting tension leave my body. I am giving myself permission to slow down. I am calm, and clarity is coming.',
      },
      {
        title: 'Soft Landing',
        script:
          'I am releasing the weight of yesterday. I am not my anxious thoughts. I am choosing peace over perfection. I am gently returning to the present whenever my mind wanders. I am held. I am allowed to feel without fixing.',
      },
      {
        title: 'Quiet Strength',
        script:
          'I am steady even when the world feels loud. I am protecting my peace. I am not in a rush — everything will unfold in time. I am choosing to respond, not react. I am giving my nervous system what it needs. I am safe to simply be.',
      },
    ],
  },
  {
    label: 'Living in the Present',
    scripts: [
      {
        title: 'Right Here',
        script:
          'I am fully present in this moment. I am not behind, and I am not running out of time. I am letting go of what has already passed. I am focused on what is in front of me right now. I am alive, awake, and here. I am savoring today.',
      },
      {
        title: 'This Moment',
        script:
          'I am anchored in the now. I am releasing the need to plan every step ahead. I am experiencing my life, not just managing it. I am noticing the beauty in ordinary things. I am grateful for this exact breath. I am choosing presence over productivity.',
      },
      {
        title: 'Grounded',
        script:
          'I am rooted in today. I am not borrowing trouble from tomorrow. I am paying attention to how things feel, not just how they look. I am trusting that the future will take care of itself. I am here. I am showing up fully for this one moment.',
      },
    ],
  },
  {
    label: 'Creativity',
    scripts: [
      {
        title: 'Make Things',
        script:
          "I am a maker. I am full of ideas worth exploring. I am not waiting for permission to create. I am trusting my instincts and following my curiosity. I am allowed to make things that aren't perfect. I am building something only I can build.",
      },
      {
        title: 'Flow State',
        script:
          'I am creative by nature. I am open to inspiration from unexpected places. I am giving myself space to experiment without judgment. I am letting the work lead me somewhere new. I am playful with my process. I am doing the work that lights me up.',
      },
      {
        title: 'Original',
        script:
          'I am bringing something new into the world. I am not copying — I am synthesizing, remixing, and making it mine. I am confident in my creative voice. I am patient with the messy middle of every project. I am proof that creativity is a practice, not a gift. I am creating today.',
      },
    ],
  },
];

const navigateToCustomize = (title: string, script: string) => {
  router.push({
    pathname: '/(main)/create/customize',
    params: { title, script },
  });
};

export default function CreateChooseMethodScreen() {
  const { scripts } = usePreWrittenScripts();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Create." />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Confidence scripts (from Supabase) */}
        <View style={styles.section}>
          <Text style={styles.label}>Confidence Scripts</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scriptList}
          >
            {scripts.map((item, index) => (
              <View key={item.id} style={index > 0 ? styles.cardGap : undefined}>
                <PreWrittenScriptCard
                  script={item}
                  onPress={() => navigateToCustomize(item.title, item.script)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Additional categories */}
        {SCRIPT_CATEGORIES.map((category) => (
          <View key={category.label} style={styles.section}>
            <Text style={styles.label}>{category.label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scriptList}
            >
              {category.scripts.map((item, index) => (
                <View key={item.title} style={index > 0 ? styles.cardGap : undefined}>
                  <PreWrittenScriptCard
                    script={item}
                    onPress={() => navigateToCustomize(item.title, item.script)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <BottomBar
        onBack={() => router.dismiss()}
        ctaLabel="Custom Script"
        ctaOnPress={() => router.push('/(main)/create/custom')}
        ctaVariant="white"
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
    paddingTop: 24,
    paddingBottom: 16,
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
  cardGap: {
    marginLeft: 16,
  },
});
