import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONTS } from '@/lib/constants';

export default function SettingsScreen() {
  const { signOut, deleteAccount } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        signOut();
      }
    } else {
      Alert.alert('Log out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', onPress: () => signOut() },
      ]);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      console.error('Delete account error:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete account. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  const deleteEnabled = deleteText.trim().toUpperCase() === 'DELETE';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={styles.deleteButtonText}>Delete my account</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setDeleteModalVisible(false)}
          />
          <Pressable style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Warning */}
            <View style={styles.modalWarning}>
              <Text style={styles.modalWarningTitle}>Are you sure?</Text>
              <Text style={styles.modalWarningBody}>
                All recordings and user data will be deleted and not able to be
                recovered.
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Input */}
            <View style={styles.modalInputSection}>
              <Text style={styles.modalInputLabel}>
                Type DELETE below to confirm
              </Text>
              <View style={styles.modalInputCard}>
                <TextInput
                  style={styles.modalInput}
                  value={deleteText}
                  onChangeText={setDeleteText}
                  placeholder="DELETE"
                  placeholderTextColor={`${COLORS.text}50`}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Bottom bar */}
            <View style={styles.modalBottomBar}>
              <Pressable
                style={styles.modalBackButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteText('');
                }}
              >
                <Text style={styles.backArrow}>{'\u2190'}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDeleteButton,
                  !deleteEnabled && styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={!deleteEnabled || isDeleting}
              >
                <Text style={styles.modalDeleteButtonText}>
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 31,
    paddingTop: 16,
  },
  backButton: {
    width: 63,
    height: 63,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.text,
  },
  title: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 57,
    lineHeight: 57 * 0.76,
    color: COLORS.text,
  },
  actions: {
    paddingHorizontal: 31,
    paddingTop: 40,
    gap: 16,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#C30000',
    borderRadius: 66,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#B2B2B2',
    shadowOffset: { width: 10, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 4,
  },
  deleteButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: '#C30000',
  },
  logoutButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    borderRadius: 66,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#B2B2B2',
    shadowOffset: { width: 10, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 4,
  },
  logoutButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: COLORS.text,
  },

  // Delete confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.54)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAFAFC',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 8,
  },
  modalHandle: {
    width: 24,
    height: 4,
    borderRadius: 45,
    backgroundColor: COLORS.text,
    opacity: 0.1,
  },
  modalWarning: {
    gap: 8,
    width: '100%',
  },
  modalWarningTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: '#C30000',
    textAlign: 'center',
  },
  modalWarningBody: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    lineHeight: 13 * 1.26,
    color: COLORS.text,
    opacity: 0.6,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    width: '100%',
  },
  modalInputSection: {
    gap: 8,
    width: '100%',
  },
  modalInputLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    lineHeight: 13 * 1.26,
    color: COLORS.text,
    opacity: 0.6,
  },
  modalInputCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DEDEDE',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#B2B2B2',
    shadowOffset: { width: 10, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 4,
  },
  modalInput: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    lineHeight: 16 * 1.06,
    color: COLORS.text,
  },
  modalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
    paddingBottom: 30,
    paddingHorizontal: 24,
    marginHorizontal: -32,
    width: '100%',
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: '#FAFAFC',
  },
  modalBackButton: {
    width: 63,
    height: 63,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#C30000',
    borderRadius: 100,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.2,
  },
  modalDeleteButtonText: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    lineHeight: 18 * 0.86,
    color: COLORS.white,
  },
});
