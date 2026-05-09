import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InfoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Заголовок с иконкой */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.tint + '20' }]}>
            <IconSymbol name="newspaper.fill" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>О фейках</Text>
        </View>

        {/* Что такое фейк */}
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="questionmark.circle.fill" size={22} color={colors.tint} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Что такое фейковая новость?</Text>
          </View>
          <Text style={[styles.cardText, { color: colors.text }]}>
            Фейк (подделка) — это умышленно распространяемая недостоверная информация, часто имеющая сенсационный характер. Цели могут быть разными: манипуляция общественным мнением, привлечение внимания, финансовая выгода или просто развлечение.
          </Text>
        </View>

        {/* Разделитель */}
        <View style={styles.divider} />

        {/* Признаки фейков */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Как распознать фейк</Text>

        <View style={[styles.featureCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: colors.tint + '15' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.tint} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Кричащий заголовок</Text>
            <Text style={[styles.featureDescription, { color: colors.icon }]}>
              Заголовки с восклицательными знаками, словами "ШОК", "СРОЧНО" — часто признак фейка.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: colors.tint + '15' }]}>
            <IconSymbol name="link" size={24} color={colors.tint} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Отсутствие источников</Text>
            <Text style={[styles.featureDescription, { color: colors.icon }]}>
              Достоверные новости ссылаются на конкретные источники, экспертов или официальные данные.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: colors.tint + '15' }]}>
            <IconSymbol name="calendar" size={24} color={colors.tint} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Дата и контекст</Text>
            <Text style={[styles.featureDescription, { color: colors.icon }]}>
              Часто фейки вырывают старые события из контекста или публикуют без даты.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={[styles.featureIconContainer, { backgroundColor: colors.tint + '15' }]}>
            <IconSymbol name="person.fill" size={24} color={colors.tint} />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Анонимный автор</Text>
            <Text style={[styles.featureDescription, { color: colors.icon }]}>
              Отсутствие имени автора или подпись "Редакция" — повод задуматься.
            </Text>
          </View>
        </View>

        {/* Разделитель */}
        <View style={styles.divider} />

        {/* Советы */}
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="lightbulb.fill" size={22} color={colors.tint} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Как не стать жертвой</Text>
          </View>
          <Text style={[styles.cardText, { color: colors.text }]}>
            • Проверяйте информацию в нескольких независимых источниках{'\n'}
            • Обращайте внимание на дату публикации{'\n'}
            • Ищите первоисточник, особенно если статья ссылается на "учёных" или "исследования"{'\n'}
            • Используйте фактчекинговые сервисы и наше приложение{'\n'}
            • Не распространяйте сомнительные новости
          </Text>
        </View>

        {/* Копирайт */}
        <Text style={[styles.copyright, { color: colors.icon }]}>
          © 2025 VeriFact. Помогаем бороться с дезинформацией.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
    opacity: 0.3,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});