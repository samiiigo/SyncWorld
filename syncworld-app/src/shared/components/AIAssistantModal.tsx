import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { aiService, AIAssistantMember, RecommendedSlot } from '@/shared/lib/ai/aiService';
import { useCreateStyles, useThemedColors, type ColorPalette } from '@/shared/theme';

interface AIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  members: AIAssistantMember[];
  baseTimestamp: number;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  visible,
  onClose,
  members,
  baseTimestamp,
}) => {
  const colors = useThemedColors();
  const styles = useCreateStyles(createStyles);
  const [activeTab, setActiveTab] = useState<'optimize' | 'nl_parser' | 'insights'>('optimize');
  const [isLoading, setIsLoading] = useState(false);
  
  // Optimize State
  const [meetingType, setMeetingType] = useState('30m sync');
  const [preferences, setPreferences] = useState('');
  const [slots, setSlots] = useState<RecommendedSlot[]>([]);
  const [optimizeInsight, setOptimizeInsight] = useState('');

  // NL Parser State
  const [prompt, setPrompt] = useState('');
  const [nlResult, setNlResult] = useState<any>(null);

  // Insights State
  const [teamInsights, setTeamInsights] = useState<any>(null);

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.optimizeSchedule(members, baseTimestamp, meetingType, preferences);
      setSlots(res.slots);
      setOptimizeInsight(res.insights);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseNL = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const res = await aiService.parseNaturalLanguage(prompt, members, baseTimestamp, 'UTC');
      setNlResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetInsights = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.getTimezoneInsights(members);
      setTeamInsights(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'optimize' && styles.activeTab]}
        onPress={() => setActiveTab('optimize')}
      >
        <Text style={[styles.tabText, activeTab === 'optimize' && styles.activeTabText]}>Optimize</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'nl_parser' && styles.activeTab]}
        onPress={() => setActiveTab('nl_parser')}
      >
        <Text style={[styles.tabText, activeTab === 'nl_parser' && styles.activeTabText]}>Ask AI</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
        onPress={() => {
          setActiveTab('insights');
          if (!teamInsights) handleGetInsights();
        }}
      >
        <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>Insights</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Gemini AI Assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {renderTabs()}

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {activeTab === 'optimize' && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Meeting Type (e.g. 30m sync)"
                  placeholderTextColor={colors.textTertiary}
                  value={meetingType}
                  onChangeText={setMeetingType}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Custom Preferences (e.g. no meetings on Friday)"
                  placeholderTextColor={colors.textTertiary}
                  value={preferences}
                  onChangeText={setPreferences}
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleOptimize} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actionText}>Find Best Slots</Text>}
                </TouchableOpacity>

                {optimizeInsight ? <Text style={styles.insightText}>{optimizeInsight}</Text> : null}
                
                {slots.map((slot, i) => (
                  <View key={i} style={styles.card}>
                    <Text style={styles.cardTitle}>{slot.label}</Text>
                    <Text style={styles.cardText}>Score: {slot.harmonyScore}/100</Text>
                    <Text style={styles.cardText}>{slot.reasoning}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'nl_parser' && (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder='e.g., "Tomorrow 3pm in Tokyo"'
                  placeholderTextColor={colors.textTertiary}
                  value={prompt}
                  onChangeText={setPrompt}
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleParseNL} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actionText}>Parse Time</Text>}
                </TouchableOpacity>

                {nlResult && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Parsed UTC Time</Text>
                    <Text style={styles.cardText}>{nlResult.formattedUtc}</Text>
                    <Text style={styles.cardText}>{nlResult.explanation}</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'insights' && (
              <View>
                {isLoading && !teamInsights ? (
                  <ActivityIndicator color={colors.textPrimary} style={{ marginTop: 20 }} />
                ) : teamInsights ? (
                  <View>
                    <Text style={styles.sectionTitle}>Golden Window</Text>
                    <Text style={styles.insightText}>{teamInsights.goldenWindow}</Text>
                    
                    <Text style={styles.sectionTitle}>Team Insights</Text>
                    {teamInsights.insights?.map((insight: string, i: number) => (
                      <Text key={i} style={styles.listItem}>• {insight}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (c: ColorPalette) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: c.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: c.textSecondary,
    fontSize: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: c.primary,
  },
  tabText: {
    color: c.textSecondary,
    fontWeight: '700',
  },
  activeTabText: {
    color: c.primary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  input: {
    backgroundColor: c.surfaceElevated,
    color: c.textPrimary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: c.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: c.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  insightText: {
    color: c.textSecondary,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  card: {
    backgroundColor: c.surfaceElevated,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  cardTitle: {
    color: c.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 5,
  },
  cardText: {
    color: c.textStrong,
    marginTop: 4,
  },
  sectionTitle: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
  },
  listItem: {
    color: c.textStrong,
    marginBottom: 8,
    lineHeight: 20,
  },
}) as const;
