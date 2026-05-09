import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

type HistoryItem = {
  id: string;
  text: string;
  verdict: 'fake' | 'real';
  confidence: number;
  timestamp: string;
};

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const loadHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem('history');
      const data = historyJson ? JSON.parse(historyJson) : [];
      setHistory(data);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const handleClearAll = () => {
    Alert.alert('Очистить историю', 'Вы уверены, что хотите удалить все записи?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('history');
            setHistory([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось очистить историю');
          }
        },
      },
    ]);
  };

  const handleDeleteItem = async (item: HistoryItem) => {
    try {
      const updatedHistory = history.filter(h => h.id !== item.id);
      await AsyncStorage.setItem('history', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить запись');
    }
  };

  const confirmDelete = (item: HistoryItem) => {
    Alert.alert('Удалить запись', 'Вы уверены, что хотите удалить эту запись?', [
      { text: 'Отмена', style: 'cancel', onPress: () => closeSwipeable(item.id) },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await handleDeleteItem(item);
          closeSwipeable(item.id);
        },
      },
    ]);
  };

  const closeSwipeable = (id: string) => {
    const swipeable = swipeableRefs.current.get(id);
    if (swipeable) {
      swipeable.close();
      swipeableRefs.current.delete(id);
    }
  };

  const navigateToDetail = (id: string) => {
    router.push(`/detail?id=${id}`);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (date >= today) {
      return `Сегодня, ${timeStr}`;
    } else if (date >= yesterday) {
      return `Вчера, ${timeStr}`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    return history.filter(item =>
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const renderRightActions = (item: HistoryItem) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => confirmDelete(item)}
    >
      <IconSymbol name="trash" size={24} color="#ffffff" />
      <Text style={styles.deleteButtonText}>Удалить</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const verdictColor = item.verdict === 'fake' ? '#e74c3c' : '#2ecc71';
    const verdictText = item.verdict === 'fake' ? 'Фейк' : 'Правда';
    const truncatedText = item.text.length > 60 ? item.text.slice(0, 60) + '…' : item.text;

    return (
      <Swipeable
        ref={ref => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          } else {
            swipeableRefs.current.delete(item.id);
          }
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        rightThreshold={40}
        onSwipeableWillOpen={() => {
          swipeableRefs.current.forEach((swipeable, key) => {
            if (key !== item.id) {
              swipeable.close();
            }
          });
        }}
      >
        <TouchableOpacity
          style={[styles.itemContainer, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}
          onPress={() => navigateToDetail(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <IconSymbol
              name={item.verdict === 'fake' ? 'exclamationmark.triangle.fill' : 'checkmark.seal.fill'}
              size={24}
              color={verdictColor}
            />
            <View style={styles.itemContent}>
              <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
                {truncatedText}
              </Text>
              <Text style={[styles.itemDate, { color: colors.icon }]}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.itemConfidence, { color: verdictColor }]}>{item.confidence}%</Text>
            <Text style={[styles.itemVerdict, { color: verdictColor }]}>{verdictText}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="clock.arrow.circlepath" size={64} color={colors.icon} />
      <Text style={[styles.emptyText, { color: colors.text }]}>История пуста</Text>
      <Text style={[styles.emptySubtext, { color: colors.icon }]}>
        Проверьте новость на главном экране, и результат появится здесь
      </Text>
      <TouchableOpacity
        style={[styles.goToCheckButton, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.goToCheckButtonText}>Перейти к проверке</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>История проверок</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <IconSymbol name="trash" size={22} color={colors.tint} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}
            placeholder="Поиск по тексту"
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>

        {filteredHistory.length === 0 ? (
          searchQuery ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Ничего не найдено</Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                Попробуйте изменить поисковый запрос
              </Text>
            </View>
          ) : (
            renderEmptyComponent()
          )
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 40,
    fontSize: 16,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 24,
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemContent: {
    marginLeft: 12,
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemConfidence: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemVerdict: {
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goToCheckButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goToCheckButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
  },
});