import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkNewsWithGemini } from '@/services/gemini-api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Проверка, содержит ли текст ссылку (упрощённая версия)
function containsUrl(text: string): boolean {
  const urlPattern = /https?:\/\/[^\s]+/g;
  return urlPattern.test(text);
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ isFake: boolean; confidence: number } | null>(null);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(100);

  const handleCheck = async () => {
    if (!inputText.trim()) {
      Alert.alert('Ошибка', 'Введите текст новости или ссылку');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setResult(null);
    setCurrentResultId(null);

    try {
      const data = await checkNewsWithGemini(inputText.trim());

      const newId = Date.now().toString();
      setResult(data);
      setCurrentResultId(newId);

      const historyItem = {
        id: newId,
        text: inputText.trim(),
        verdict: data.isFake ? 'fake' : 'real',
        confidence: data.confidence,
        timestamp: new Date().toISOString(),
        explanation: data.explanation,
      };

      const existingHistory = await AsyncStorage.getItem('history');
      let history = existingHistory ? JSON.parse(existingHistory) : [];
      history = [historyItem, ...history].slice(0, 50);
      await AsyncStorage.setItem('history', JSON.stringify(history));
    } catch (error: any) {
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось проверить новость. Попробуйте позже.'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `Результат проверки: ${result.isFake ? 'Фейк' : 'Правда'}, уверенность ${result.confidence}%`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearInput = () => {
    setInputText('');
    setInputHeight(100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goToDetail = () => {
    if (currentResultId) {
      router.push(`/detail?id=${currentResultId}`);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInputText(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Буфер обмена пуст');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось вставить текст');
    }
  };

  // Определяем текст для кнопки в зависимости от состояния и наличия ссылки
  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <ActivityIndicator color="#ffffff" />
          <Text style={[styles.checkButtonText, { marginLeft: 8 }]}>
            {containsUrl(inputText) ? 'Загружаем статью...' : 'Анализируем...'}
          </Text>
        </>
      );
    }
    return (
      <>
        <IconSymbol name="paperplane.fill" size={20} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.checkButtonText}>Проверить</Text>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Шапка */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>VeriFact</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Проверка новостей с помощью искусственного интеллекта
            </Text>
          </View>

          {/* Карточка ввода */}
          <View style={[styles.inputCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.text, height: Math.min(300, Math.max(100, inputHeight)) }]}
                placeholder="Введите текст новости или ссылку"
                placeholderTextColor={colors.icon}
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
              />
              {inputText.length > 0 && (
                <TouchableOpacity onPress={clearInput} style={styles.clearButton}>
                  <IconSymbol name="xmark.circle.fill" size={22} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>

            {/* Кнопка вставки из буфера */}
            <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteButton}>
              <IconSymbol name="doc.on.clipboard" size={20} color={colors.tint} />
              <Text style={[styles.pasteButtonText, { color: colors.tint }]}>Вставить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkButton, { backgroundColor: colors.tint }]}
              onPress={handleCheck}
              disabled={loading}
              activeOpacity={0.7}
            >
              {getButtonContent()}
            </TouchableOpacity>
          </View>

          {/* Результат (если есть) */}
          {result && (
            <View style={[styles.resultCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>Результат проверки</Text>
              <View style={styles.verdictRow}>
                <IconSymbol
                  name={result.isFake ? 'exclamationmark.triangle.fill' : 'checkmark.seal.fill'}
                  size={32}
                  color={result.isFake ? '#e74c3c' : '#2ecc71'}
                />
                <Text
                  style={[
                    styles.verdictText,
                    { color: result.isFake ? '#e74c3c' : '#2ecc71' },
                  ]}
                >
                  {result.isFake ? 'ФЕЙК' : 'ПРАВДА'}
                </Text>
              </View>
              <Text style={[styles.confidenceText, { color: colors.text }]}>
                Уверенность: {result.confidence}%
              </Text>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={goToDetail}
                  disabled={!currentResultId}
                >
                  <Text style={[styles.detailButtonText, { color: colors.tint }]}>Подробнее</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare}>
                  <IconSymbol name="square.and.arrow.up" size={24} color={colors.tint} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Информационный блок о приложении */}
          <View style={[styles.infoCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Как работает VeriFact?</Text>
            <View style={styles.infoRow}>
              <IconSymbol name="brain.head.profile" size={28} color={colors.tint} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Использует современные нейросети для анализа текста и выявления признаков фейков.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol name="link" size={28} color={colors.tint} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Поддерживает проверку по ссылкам — достаточно вставить URL статьи.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol name="clock.arrow.circlepath" size={28} color={colors.tint} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Все результаты сохраняются в историю, чтобы вы могли вернуться к ним позже.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol name="lock.shield" size={28} color={colors.tint} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Ваши данные не передаются третьим лицам, проверка происходит анонимно.
              </Text>
            </View>
            <Text style={[styles.infoFooter, { color: colors.icon }]}>
              VeriFact использует открытые модели ИИ и постоянно совершенствуется.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 8,
    paddingTop: 12,
  },
  clearButton: {
    padding: 8,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  checkButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verdictText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  confidenceText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 16,
  },
  detailButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  detailButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    marginTop: 30,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  infoFooter: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});