import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAffirmations } from '@/hooks/useAffirmations';
import { deleteAudio } from '@/lib/storage';
import { COLORS } from '@/lib/constants';
import { BottomBar } from '@/components/ui/BottomBar';
import { AffirmationCard } from '@/components/affirmation/AffirmationCard';
import type { Affirmation } from '@/types';

export default function ManageScreen() {
  const { affirmations, deleteAffirmation } = useAffirmations();

  const handleDelete = async (affirmation: Affirmation) => {
    const doDelete = async () => {
      if (affirmation.audio_url) {
        try { await deleteAudio(affirmation.audio_url); } catch {}
      }
      await deleteAffirmation(affirmation.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${affirmation.title}"?\n\nThis cannot be undone.`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Affirmation',
        `Are you sure you want to delete "${affirmation.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleReRecord = (affirmation: Affirmation) => {
    router.push({
      pathname: '/(main)/create/record',
      params: {
        title: affirmation.title,
        script: affirmation.script,
        affirmationId: affirmation.id,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All affirmations</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeButton}>Close</Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={affirmations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AffirmationCard
            affirmation={item}
            onReRecord={() => handleReRecord(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No affirmations yet.</Text>
          </View>
        }
      />

      <BottomBar
        onBack={() => router.back()}
        ctaLabel="+ Add New"
        ctaOnPress={() => router.push('/(main)/create')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 15,
    color: COLORS.text,
  },
  list: {
    paddingHorizontal: 25,
    paddingBottom: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
