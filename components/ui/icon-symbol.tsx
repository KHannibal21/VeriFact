import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Основные иконки навигации
  'house.fill': 'home',
  'clock.fill': 'history',
  'info.circle.fill': 'info',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  
  // Иконки для результатов и действий
  'exclamationmark.triangle.fill': 'warning',
  'checkmark.seal.fill': 'verified',
  'xmark.circle.fill': 'cancel',
  'square.and.arrow.up': 'share',
  'trash': 'delete',
  'chevron.left': 'chevron-left',
  'link': 'link',
  
  // Иконки для детального анализа
  'chart.bar': 'bar-chart',
  'mic': 'mic',
  'checklist': 'checklist',
  'globe': 'language',
  'brain.head.profile': 'psychology',
  'clock.arrow.circlepath': 'history',
  'lock.shield': 'security',
  
  // Иконки для информационного экрана
  'envelope.fill': 'email',
  'doc.text.fill': 'description',
  'calendar': 'event',
  'questionmark.circle.fill': 'help',
  'doc.text.magnifyingglass': 'find-in-page',
  'newspaper.fill': 'newspaper',
  'lightbulb.fill': 'lightbulb',
  
  // Иконка для поиска
  'magnifyingglass': 'search',
  'person.fill': 'person',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: never; // не используется на Android/Web
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}