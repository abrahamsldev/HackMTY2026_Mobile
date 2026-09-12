import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type TextInputHandle } from '@/components/accessible-primitives';
import { InfoBanner } from '@/components/ui/info-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  AssistantWelcome,
  ChatComposer,
  ChatMessage,
  QuestionBank,
  extractFirstName,
} from '@/features/assistant/components';
import { useAssistant } from '@/features/assistant/use-assistant';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';
import { messageSurfaceId, type A2UIAction, type A2UISurfaceState } from '@/features/a2ui';
import type { AgentReply } from '@/features/assistant/agent';

export type AssistantLayoutMode = 'welcome' | 'conversation';

type ArchivedTurn = {
  id: string;
  query: string;
  timestamp: number;
  reply?: AgentReply;
  surfaces?: readonly A2UISurfaceState[];
  error?: string | null;
};

export default function HomeScreen() {
  const { session, profile } = useSession();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {session && (
        <AssistantWorkspace key={session.user.id} currentUserId={session.user.id} userMetadata={session.user.user_metadata} profileFullName={profile.fullName} />
      )}
    </KeyboardAvoidingView>
  );
}

function AssistantWorkspace({
  currentUserId,
  userMetadata,
  profileFullName,
}: {
  currentUserId: string;
  userMetadata?: Record<string, unknown> | null;
  profileFullName?: string | null;
}) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const insets = useSafeAreaInsets();
  const assistant = useAssistant(currentUserId);

  const [pastTurns, setPastTurns] = useState<ArchivedTurn[]>([]);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [activeResponseFloor, setActiveResponseFloor] = useState(0);
  const [query, setQuery] = useState('');
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingQuery, setEditingQuery] = useState('');

  const queryInput = useRef<TextInputHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const submissionLocked = useRef(false);

  const firstName = extractFirstName(userMetadata, profileFullName);
  const isConversation = Boolean(activeQuery) || pastTurns.length > 0;
  const mode: AssistantLayoutMode = isConversation ? 'conversation' : 'welcome';
  const activeResponse = assistant.surface && assistant.surface.revision > activeResponseFloor
    ? assistant.surface
    : null;
  const activeSurfaces = useMemo(() => {
    if (!activeResponse?.reply.messages) return [];
    const responseSurfaceIds = new Set(activeResponse.reply.messages.map(messageSurfaceId));
    return activeResponse.a2uiSurfaces.filter(({ surfaceId }) => responseSurfaceIds.has(surfaceId));
  }, [activeResponse]);

  useEffect(() => {
    if (!activeQuery && !showQuestionBank) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: !settings.reduceMotion });
    }, 80);
    return () => clearTimeout(timer);
  }, [
    activeQuery,
    activeResponse?.revision,
    assistant.error,
    assistant.pending,
    pastTurns.length,
    settings.reduceMotion,
    showQuestionBank,
  ]);

  function archiveActiveTurn() {
    if (!activeQuery || !activeTurnId) return;
    setPastTurns((previous) => [
      ...previous,
      {
        id: activeTurnId,
        query: activeQuery,
        timestamp: Date.now(),
        reply: activeResponse?.reply,
        surfaces: activeSurfaces,
        error: assistant.error,
      },
    ]);
  }

  function handleSubmit(submittedText: string) {
    const text = submittedText.trim();
    if (!text || assistant.pending || submissionLocked.current || !assistant.isConfigured) return;
    submissionLocked.current = true;

    archiveActiveTurn();

    const nextId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setActiveResponseFloor(assistant.surface?.revision ?? 0);
    setActiveQuery(text);
    setActiveTurnId(nextId);
    setQuery('');
    setShowQuestionBank(false);
    setEditingTurnId(null);
    setEditingQuery('');
    Keyboard.dismiss();

    void assistant.send(text).finally(() => {
      submissionLocked.current = false;
    });
  }

  function handleSelectSuggestion(suggestion: string) {
    setQuery(suggestion);
    setShowQuestionBank(false);
    queryInput.current?.focus();
  }

  function handleRetry() {
    if (assistant.pending || submissionLocked.current) return;
    submissionLocked.current = true;
    const retry = assistant.retry();
    if (!retry) {
      submissionLocked.current = false;
      return;
    }
    void retry.finally(() => {
      submissionLocked.current = false;
    });
  }

  function handleBeginEdit() {
    if (!activeQuery || !activeTurnId || assistant.pending) return;
    setEditingTurnId(activeTurnId);
    setEditingQuery(activeQuery);
    Keyboard.dismiss();
  }

  function handleCancelEdit() {
    setEditingTurnId(null);
    setEditingQuery('');
  }

  function handleSubmitEdit() {
    const text = editingQuery.trim();
    if (!text || !activeQuery || assistant.pending || submissionLocked.current) return;
    if (text === activeQuery) {
      handleCancelEdit();
      return;
    }

    submissionLocked.current = true;
    setActiveResponseFloor(assistant.surface?.revision ?? 0);
    setActiveQuery(text);
    setEditingTurnId(null);
    setEditingQuery('');
    setShowQuestionBank(false);

    void assistant.send(text).finally(() => {
      submissionLocked.current = false;
    });
  }

  function handleCancel() {
    assistant.cancel();
    submissionLocked.current = false;
  }

  function handleDispatch(action: A2UIAction) {
    if (assistant.pending || submissionLocked.current) return;
    submissionLocked.current = true;
    archiveActiveTurn();

    const nextId = `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const actionQuery = `Acción: ${action.name}`;
    setActiveResponseFloor(assistant.surface?.revision ?? 0);
    setActiveQuery(actionQuery);
    setActiveTurnId(nextId);
    setEditingTurnId(null);
    setEditingQuery('');
    void assistant.dispatch(action).finally(() => {
      submissionLocked.current = false;
    });
  }

  return (
    <View style={[styles.workspace, { backgroundColor: theme.background }]}>
      {/* Configuration warning banner */}
      {!assistant.isConfigured && (
        <View style={styles.bannerContainer}>
          <InfoBanner message="El asistente estará disponible cuando se configure su conexión." />
        </View>
      )}

      {/* Main Conversation or Welcome Stream */}
      {mode === 'welcome' ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.welcomeScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeInner}>
            <AssistantWelcome
              firstName={firstName}
              onSelectSuggestion={handleSelectSuggestion}
              onOpenQuestionBank={() => setShowQuestionBank((prev) => !prev)}
              disabled={assistant.pending || !assistant.isConfigured}
            />

            {/* Centered Composer in Welcome Mode */}
            <View style={styles.welcomeComposerWrapper}>
              <ChatComposer
                inputRef={queryInput}
                value={query}
                onChangeText={setQuery}
                onSubmit={handleSubmit}
                loading={assistant.pending}
                disabled={!assistant.isConfigured}
                mode="welcome"
              />
            </View>

            {/* Optional Full Question Bank if opened */}
            {showQuestionBank && (
              <View style={styles.questionBankWrapper}>
                <QuestionBank
                  disabled={assistant.pending}
                  onSelect={handleSelectSuggestion}
                />
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.conversationContainer}>
          {/* Scrollable messages history */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.messagesInner}>
              {/* Past archived turns */}
              {pastTurns.map((turn) => (
                <View key={turn.id} style={styles.turnContainer}>
                  <ChatMessage role="user" content={turn.query} animate={false} />
                  <ChatMessage
                    role="assistant"
                    content={turn.reply?.message}
                    surfaces={turn.surfaces}
                    error={turn.error}
                    a2uiError={turn.reply?.a2uiError}
                    disabled={assistant.pending}
                    onDispatch={handleDispatch}
                    animate={false}
                  />
                </View>
              ))}

              {/* Active current turn */}
              {activeQuery && (
                <View style={styles.turnContainer}>
                  <ChatMessage
                    role="user"
                    content={activeQuery}
                    disabled={assistant.pending}
                    onEdit={assistant.pending ? undefined : handleBeginEdit}
                    isEditing={editingTurnId === activeTurnId}
                    editValue={editingQuery}
                    onEditValueChange={setEditingQuery}
                    onSubmitEdit={handleSubmitEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                  <ChatMessage
                    role="assistant"
                    content={activeResponse?.reply.message}
                    surfaces={activeSurfaces}
                    isPending={assistant.pending}
                    error={assistant.error}
                    a2uiError={activeResponse?.reply.a2uiError}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                    onDispatch={handleDispatch}
                    disabled={assistant.pending}
                  />
                </View>
              )}

              {/* Collapsible Question Bank in Conversation mode if opened */}
              {showQuestionBank && (
                <View style={styles.questionBankConversationWrapper}>
                  <QuestionBank
                    disabled={assistant.pending}
                    onSelect={handleSelectSuggestion}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Pinned Composer */}
          <View
            style={[
              styles.bottomComposerContainer,
                {
                  backgroundColor: theme.background,
                  paddingBottom: Math.max(insets.bottom, Spacing.two),
                },
            ]}>
            <View style={styles.bottomComposerInner}>
              <ChatComposer
                inputRef={queryInput}
                value={query}
                onChangeText={setQuery}
                onSubmit={handleSubmit}
                onOpenQuestionBank={() => setShowQuestionBank((prev) => !prev)}
                loading={assistant.pending}
                disabled={!assistant.isConfigured || Boolean(editingTurnId)}
                mode="conversation"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  workspace: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  welcomeInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.four,
  },
  welcomeComposerWrapper: {
    width: '100%',
    marginTop: Spacing.two,
  },
  questionBankWrapper: {
    width: '100%',
    maxWidth: 720,
    marginTop: Spacing.two,
  },
  conversationContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  messagesInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  turnContainer: {
    gap: Spacing.two,
  },
  questionBankConversationWrapper: {
    marginVertical: Spacing.two,
  },
  bottomComposerContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  bottomComposerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
