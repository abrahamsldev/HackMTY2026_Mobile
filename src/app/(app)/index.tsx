import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type TextInputHandle } from "@/components/accessible-primitives";
import { InfoBanner } from "@/components/ui/info-banner";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import {
  messageSurfaceId,
  type A2UIAction,
  type A2UIActionOrigin,
  type A2UISurfaceState,
} from "@/features/a2ui";
import { useAccessibility } from "@/features/accessibility/accessibility-provider";
import type { AgentReply } from "@/features/assistant/agent";
import {
  AssistantWelcome,
  ChatComposer,
  ChatMessage,
  FloatingChatBubble,
  MorphingStage,
  RequestProcessingOverlay,
  VoiceProcessingOverlay,
  WelcomeComposerReveal,
  extractFirstName,
} from "@/features/assistant/components";
import { useAssistant } from "@/features/assistant/use-assistant";
import { useVoiceFlow } from "@/features/assistant/use-voice-flow";
import { useSession } from "@/features/auth/session-provider";
import { useTheme } from "@/hooks/use-theme";

export type AssistantLayoutMode = "welcome" | "conversation";
type ActionTransitionState = "idle" | "thinking" | "success" | "failure";

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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {session && (
        <AssistantWorkspace key={session.user.id} currentUserId={session.user.id}
          userMetadata={session.user.user_metadata}
          profileFullName={profile.fullName}
        />
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
  const [query, setQuery] = useState("");
  const [quickSuggestion, setQuickSuggestion] = useState<string | null>(null);
  const [quickSuggestionComplete, setQuickSuggestionComplete] = useState(false);
  const [quickSuggestionOrigin, setQuickSuggestionOrigin] = useState<A2UIActionOrigin>();
  const [actionTransition, setActionTransition] = useState<ActionTransitionState>("idle");
  const [actionOrigin, setActionOrigin] = useState<A2UIActionOrigin>();
  const [responseRevealed, setResponseRevealed] = useState(true);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingQuery, setEditingQuery] = useState("");

  const queryInput = useRef<TextInputHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const submissionLocked = useRef(false);

  const firstName = extractFirstName(userMetadata, profileFullName);
  const isConversation = Boolean(activeQuery) || pastTurns.length > 0;
  const mode: AssistantLayoutMode = isConversation ? "conversation" : "welcome";
  const activeResponse =
    assistant.surface && assistant.surface.revision > activeResponseFloor
      ? assistant.surface
      : null;
  const activeSurfaces = useMemo(() => {
    if (!activeResponse?.reply.messages) return [];
    const responseSurfaceIds = new Set(
      activeResponse.reply.messages.map(messageSurfaceId),
    );
    return activeResponse.a2uiSurfaces.filter(({ surfaceId }) =>
      responseSurfaceIds.has(surfaceId),
    );
  }, [activeResponse]);

  useEffect(() => {
    if (!activeQuery) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: !settings.reduceMotion,
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [
    activeQuery,
    activeResponse?.revision,
    assistant.error,
    assistant.pending,
    pastTurns.length,
    settings.reduceMotion,
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

  function handleSubmit(submittedText: string): Promise<void> | undefined {
    const text = submittedText.trim();
    if (
      !text ||
      assistant.pending ||
      submissionLocked.current ||
      !assistant.isConfigured
    )
      return;
    submissionLocked.current = true;
    setResponseRevealed(false);

    archiveActiveTurn();

    const nextId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setActiveResponseFloor(assistant.surface?.revision ?? 0);
    setActiveQuery(text);
    setActiveTurnId(nextId);
    setQuery("");
    setEditingTurnId(null);
    setEditingQuery("");
    Keyboard.dismiss();

    return assistant.send(text).finally(() => {
      submissionLocked.current = false;
    });
  }

  const voice = useVoiceFlow({
    transcribe: assistant.transcribe,
    submit: handleSubmit,
  });
  // Extends the existing Banorte loader's trigger to also cover the gap
  // between "recording stopped" and "the agent request is actually in
  // flight" (audio upload + n8n STT + the moment handleSubmit hands off to
  // assistant.send) — otherwise there'd be a silent gap with no loader.
  const voiceProcessing =
    voice.phase === "transcribing" ||
    voice.phase === "submitting" ||
    voice.phase === "waiting";
  const voiceOverlayActive = voice.phase !== "idle";
  const voiceOnPress = voice.onPress;
  const handleVoicePress = useCallback(() => {
    Keyboard.dismiss();
    voiceOnPress();
  }, [voiceOnPress]);
  const voiceControl = useMemo(
    () => ({ isRecording: voice.isRecording, isBusy: voice.isBusy, onPress: handleVoicePress }),
    [voice.isRecording, voice.isBusy, handleVoicePress],
  );

  function handleQuickSuggestion(suggestion: string, origin?: A2UIActionOrigin) {
    if (quickSuggestion || assistant.pending) return;
    setQuickSuggestionOrigin(origin);
    setQuickSuggestion(suggestion);
    setQuickSuggestionComplete(false);
    const request = handleSubmit(suggestion);
    if (!request) {
      setQuickSuggestion(null);
      setQuickSuggestionOrigin(undefined);
      return;
    }
    void request.finally(() => setQuickSuggestionComplete(true));
  }

  const handleQuickSuggestionFinished = useCallback(() => {
    setQuickSuggestion(null);
    setQuickSuggestionComplete(false);
    setQuickSuggestionOrigin(undefined);
    setResponseRevealed(true);
  }, []);
  const handleActionTransitionFinished = useCallback(() => {
    setActionTransition("idle");
    setActionOrigin(undefined);
    setResponseRevealed(true);
  }, []);
  const handleResponseRevealReady = useCallback(() => {
    setResponseRevealed(true);
  }, []);
  const quickSuggestionActive = Boolean(quickSuggestion);
  const quickSuggestionWaiting = quickSuggestionActive && !quickSuggestionComplete;
  const actionTransitionActive = actionTransition !== "idle";
  const actionTransitionComplete = actionTransition === "success" || actionTransition === "failure";
  const actionTransitionWaiting = actionTransition === "thinking";
  const workspaceHidden = voiceOverlayActive || quickSuggestionWaiting || actionTransitionWaiting;
  const workspaceBlocked = voiceOverlayActive || quickSuggestionActive || actionTransitionActive;
  const assistantBottomInset = Math.max(insets.bottom, Spacing.three);
  const messagesBottomSpacing = Math.max(assistantBottomInset, 24) + 64 + Spacing.four;

  function handleRetry() {
    if (assistant.pending || submissionLocked.current) return;
    submissionLocked.current = true;
    setResponseRevealed(false);
    const retry = assistant.retry();
    if (!retry) {
      submissionLocked.current = false;
      setResponseRevealed(true);
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
    setEditingQuery("");
  }

  function handleSubmitEdit() {
    const text = editingQuery.trim();
    if (!text || !activeQuery || assistant.pending || submissionLocked.current)
      return;
    if (text === activeQuery) {
      handleCancelEdit();
      return;
    }

    submissionLocked.current = true;
    setResponseRevealed(false);
    setActiveResponseFloor(assistant.surface?.revision ?? 0);
    setActiveQuery(text);
    setEditingTurnId(null);
    setEditingQuery("");

    void assistant.send(text).finally(() => {
      submissionLocked.current = false;
    });
  }

  function handleCancel() {
    assistant.cancel();
    submissionLocked.current = false;
  }

  async function handleDispatch(action: A2UIAction, origin?: A2UIActionOrigin) {
    if (assistant.pending || submissionLocked.current || actionTransitionActive) return;
    submissionLocked.current = true;
    setResponseRevealed(false);
    setActionOrigin(origin);
    setActionTransition("thinking");
    try {
      const succeeded = await assistant.dispatch(action);
      setActionTransition(succeeded ? "success" : "failure");
    } catch {
      setActionTransition("failure");
    } finally {
      submissionLocked.current = false;
    }
  }

  return (
    <View style={[styles.workspace, { backgroundColor: theme.background }]}>
      <VoiceProcessingOverlay phase={voice.phase} level={voice.level} status={assistant.status} onStop={handleVoicePress} />
      <RequestProcessingOverlay
        active={quickSuggestionActive}
        complete={quickSuggestionComplete}
        pendingLabel="Procesando sugerencia"
        status={assistant.status}
        bottomInset={assistantBottomInset}
        origin={quickSuggestionOrigin}
        onFinished={handleQuickSuggestionFinished}
      />
      <RequestProcessingOverlay
        active={actionTransitionActive}
        complete={actionTransitionComplete}
        outcome={actionTransition === "failure" ? "failure" : "success"}
        pendingLabel="Procesando acción"
        bottomInset={assistantBottomInset}
        origin={actionOrigin}
        onFinished={handleActionTransitionFinished}
      />
      <View
        accessibilityElementsHidden={workspaceHidden}
        importantForAccessibility={workspaceHidden ? "no-hide-descendants" : "auto"}
        pointerEvents={workspaceBlocked ? "none" : "auto"}
        style={[
          styles.workspaceContent,
          workspaceHidden && styles.workspaceContentHidden,
        ]}>
      {assistant.actionStatus && <View accessibilityLiveRegion="polite" style={styles.bannerContainer}>
        <InfoBanner tone={assistant.actionStatus.status === 'failure' ? 'danger' : assistant.actionStatus.status === 'success' ? 'success' : 'info'} title={assistant.actionStatus.status === 'pending' ? 'Procesando' : assistant.actionStatus.status === 'success' ? 'Completado' : 'No se pudo completar'} message={assistant.actionStatus.message} />
      </View>}
      {/* Configuration warning banner */}
      {!assistant.isConfigured && (
        <View style={styles.bannerContainer}>
          <InfoBanner message={assistant.configurationError ?? "Estamos cargando tu cuenta bancaria."} />
        </View>
      )}

      {/* Main Conversation or Welcome Stream */}
      {mode === "welcome" ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.welcomeScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeInner}>
            <AssistantWelcome
              firstName={firstName}
              onSelectSuggestion={handleQuickSuggestion}
              disabled={assistant.pending || !assistant.isConfigured}
            />

            {/* Centered Composer in Welcome Mode */}
            <View style={styles.welcomeComposerWrapper}>
              <WelcomeComposerReveal>
                <ChatComposer
                  inputRef={queryInput}
                  value={query}
                  onChangeText={setQuery}
                  onSubmit={handleSubmit}
                  voice={voiceControl}
                  loading={(assistant.pending && !assistant.actionStatus) || voiceProcessing}
                  disabled={!assistant.isConfigured}
                  mode="welcome"
                />
              </WelcomeComposerReveal>
            </View>

          </View>
        </ScrollView>
      ) : (
        <View style={styles.conversationContainer}>
          {/* Scrollable messages history */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={[
              styles.messagesContent,
              { paddingBottom: messagesBottomSpacing },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.messagesInner}>
              {/* Active current turn with bubble collapse & morphing stage */}
              {(Boolean(activeQuery) || Boolean(activeResponse) || assistant.pending) && (
                <View style={styles.turnContainer}>
                  {Boolean(activeQuery) && (
                    <ChatMessage
                      role="user"
                      content={activeQuery ?? ""}
                      disabled={assistant.pending}
                      onEdit={assistant.pending ? undefined : handleBeginEdit}
                      isEditing={editingTurnId === activeTurnId}
                      editValue={editingQuery}
                      onEditValueChange={setEditingQuery}
                      onSubmitEdit={handleSubmitEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  )}
                  <MorphingStage
                    isPending={assistant.pending && !assistant.actionStatus}
                    hasContent={Boolean(activeResponse?.reply.message || activeSurfaces.length > 0 || pastTurns.length > 0)}
                    revealed={responseRevealed}
                    error={assistant.error}
                    onCancel={handleCancel}
                  >
                    <ChatMessage
                      role="assistant"
                      animate={false}
                      content={activeResponse?.reply.message}
                      surfaces={activeSurfaces}
                      isPending={assistant.pending && !assistant.actionStatus}
                      agentStatus={assistant.status}
                      error={assistant.error}
                      a2uiError={activeResponse?.reply.a2uiError}
                      onRetry={handleRetry}
                      onCancel={handleCancel}
                      onDispatch={handleDispatch}
                      disabled={assistant.pending}
                    />
                  </MorphingStage>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Floating Chat Bubble Button with gentle motion and bubble popup */}
          {!quickSuggestionActive && !actionTransitionActive && (
            <FloatingChatBubble
              inputRef={queryInput}
              value={query}
              onChangeText={setQuery}
              onSubmit={handleSubmit}
              voice={voiceControl}
              loading={(assistant.pending && !assistant.actionStatus) || voiceProcessing}
              status={assistant.status}
              disabled={!assistant.isConfigured || Boolean(editingTurnId)}
              bottomInset={assistantBottomInset}
              onRevealReady={handleResponseRevealReady}
            />
          )}
        </View>
      )}
      </View>
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
  workspaceContent: {
    flex: 1,
  },
  workspaceContentHidden: {
    opacity: 0,
  },
  bannerContainer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  welcomeInner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
    gap: Spacing.four,
  },
  welcomeComposerWrapper: {
    width: "100%",
    marginTop: Spacing.two,
  },
  conversationContainer: {
    flex: 1,
    justifyContent: "space-between",
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
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
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
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
});
