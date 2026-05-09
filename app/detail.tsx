import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HistoryItem = {
  id: string;
  text: string;
  verdict: 'fake' | 'real';
  confidence: number;
  timestamp: string;
  explanation?: string;
};

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('history');
      const history: HistoryItem[] = historyJson ? JSON.parse(historyJson) : [];
      const found = history.find((h) => h.id === id);
      setItem(found || null);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `Результат проверки новости: ${item.verdict === 'fake' ? 'Фейк' : 'Правда'} (уверенность ${item.confidence}%). Текст: ${item.text}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyText = async () => {
    if (!item) return;
    await Clipboard.setStringAsync(item.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Скопировано', 'Текст новости скопирован в буфер обмена');
  };

  const handleCopyExplanation = async () => {
    if (!item?.explanation) return;
    await Clipboard.setStringAsync(item.explanation);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Скопировано', 'Пояснение ИИ скопировано в буфер обмена');
  };

  const handleDelete = async () => {
    if (!item || deleting) return;
    Alert.alert(
      'Удалить запись',
      'Вы уверены, что хотите удалить этот результат из истории?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const historyJson = await AsyncStorage.getItem('history');
              const history: HistoryItem[] = historyJson ? JSON.parse(historyJson) : [];
              const updatedHistory = history.filter((h) => h.id !== item.id);
              await AsyncStorage.setItem('history', JSON.stringify(updatedHistory));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить запись');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Извлекаем URL из текста, если есть
  const extractUrl = (text: string): string | null => {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlPattern);
    return matches ? matches[0] : null;
  };

  const openLink = () => {
    if (!item) return;
    const url = extractUrl(item.text);
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Ошибка', 'Не удалось открыть ссылку. Проверьте подключение к интернету.')
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.centered}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>Запись не найдена</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const verdictColor = item.verdict === 'fake' ? '#e74c3c' : '#2ecc71';
  const verdictText = item.verdict === 'fake' ? 'ФЕЙК' : 'ПРАВДА';
  const formattedDate = new Date(item.timestamp).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const url = extractUrl(item.text);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Верхняя панель */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} disabled={deleting}>
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton} disabled={deleting}>
              <IconSymbol name="square.and.arrow.up" size={24} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <IconSymbol name="trash" size={24} color={colors.tint} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Контент */}
        <View style={styles.content}>
          {/* Дата */}
          <View style={styles.dateContainer}>
            <IconSymbol name="calendar" size={16} color={colors.icon} />
            <Text style={[styles.date, { color: colors.icon }]}>{formattedDate}</Text>
          </View>

          {/* Вердикт */}
          <View style={styles.verdictContainer}>
            <View style={[styles.verdictIconBackground, { backgroundColor: verdictColor + '20' }]}>
              <IconSymbol
                name={item.verdict === 'fake' ? 'exclamationmark.triangle.fill' : 'checkmark.seal.fill'}
                size={48}
                color={verdictColor}
              />
            </View>
            <Text style={[styles.verdict, { color: verdictColor }]}>{verdictText}</Text>
          </View>

          {/* Уверенность */}
          <View style={styles.confidenceSection}>
            <Text style={[styles.confidenceLabel, { color: colors.text }]}>
              Уверенность: {item.confidence}%
            </Text>
            <View style={[styles.progressBarContainer, { backgroundColor: colorScheme === 'dark' ? '#333' : '#ddd' }]}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${item.confidence}%`, backgroundColor: verdictColor },
                ]}
              />
            </View>
          </View>

          {/* Текст новости с возможностью копирования */}
          <View style={[styles.textCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
            <View style={styles.textContentContainer}>
              <Text style={[styles.textContent, { color: colors.text }]}>{item.text}</Text>
            </View>
            <TouchableOpacity onPress={handleCopyText} style={styles.copyButton}>
              <IconSymbol name="doc.on.doc" size={22} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {/* Кнопка открытия ссылки, если есть URL */}
          {url && (
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}
              onPress={openLink}
            >
              <IconSymbol name="link" size={20} color={colors.tint} />
              <Text style={[styles.linkButtonText, { color: colors.tint }]}>Открыть ссылку</Text>
            </TouchableOpacity>
          )}

          {/* Пояснение ИИ с возможностью копирования */}
          {item.explanation && (
            <View style={[styles.explanationCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
              <View style={styles.explanationHeader}>
                <IconSymbol name="brain.head.profile" size={20} color={colors.tint} />
                <Text style={[styles.explanationTitle, { color: colors.text }]}>Пояснение ИИ</Text>
                <TouchableOpacity onPress={handleCopyExplanation} style={styles.copyExplanationButton}>
                  <IconSymbol name="doc.on.doc" size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.explanationText, { color: colors.text }]}>{item.explanation}</Text>
            </View>
          )}

          {/* Детальный анализ */}
          <View style={styles.analysisSection}>
            <Text style={[styles.analysisTitle, { color: colors.text }]}>Детальный анализ</Text>
            <View style={[styles.analysisCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
              <View style={styles.analysisRow}>
                <IconSymbol name="chart.bar" size={20} color={colors.tint} />
                <Text style={[styles.analysisLabel, { color: colors.text }]}>Тональность:</Text>
                <Text style={[styles.analysisValue, { color: colors.text }]}>
                  {item.verdict === 'fake' ? 'Негативная' : 'Нейтральная/позитивная'}
                </Text>
              </View>
              <View style={styles.analysisSeparator} />
              <View style={styles.analysisRow}>
                <IconSymbol name="mic" size={20} color={colors.tint} />
                <Text style={[styles.analysisLabel, { color: colors.text }]}>Эмоциональная окраска:</Text>
                <Text style={[styles.analysisValue, { color: colors.text }]}>
                  {item.verdict === 'fake' ? 'Высокая' : 'Низкая'}
                </Text>
              </View>
              <View style={styles.analysisSeparator} />
              <View style={styles.analysisRow}>
                <IconSymbol name="checklist" size={20} color={colors.tint} />
                <Text style={[styles.analysisLabel, { color: colors.text }]}>Наличие фактов:</Text>
                <Text style={[styles.analysisValue, { color: colors.text }]}>
                  {item.verdict === 'fake' ? 'Низкое' : 'Высокое'}
                </Text>
              </View>
              <View style={styles.analysisSeparator} />
              <View style={styles.analysisRow}>
                <IconSymbol name="globe" size={20} color={colors.tint} />
                <Text style={[styles.analysisLabel, { color: colors.text }]}>Источники:</Text>
                <Text style={[styles.analysisValue, { color: colors.text }]}>
                  {item.verdict === 'fake' ? 'Не указаны/сомнительные' : 'Указаны/достоверные'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  date: {
    fontSize: 14,
    marginLeft: 6,
  },
  verdictContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verdictIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdict: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  confidenceSection: {
    marginBottom: 30,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  textCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContentContainer: {
    flex: 1,
  },
  textContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  explanationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  copyExplanationButton: {
    padding: 4,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  analysisSection: {
    marginTop: 8,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  analysisCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  analysisLabel: {
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  analysisSeparator: {
    height: 1,
    backgroundColor: '#ccc',
    opacity: 0.3,
    marginVertical: 4,
  },
});