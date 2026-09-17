import * as Haptics from 'expo-haptics';

/**
 * The app's haptic vocabulary.
 *
 * Every call is fire-and-forget and swallows its error: haptics are silently
 * unavailable in plenty of normal situations (Low Power Mode, the user turned
 * the Taptic Engine off, a browser without the Vibration API), and none of them
 * are a reason to interrupt a banking flow.
 *
 * The mapping is deliberately small, so a vibration always means the same thing:
 *
 * - `selection` — the user picked something from a list of options.
 * - `edge` — a transition the user started and needs confirmed without looking,
 *   which is what makes it worth a physical cue: recording started or stopped.
 * - `settled` / `failed` — a request the user was waiting on has resolved.
 *   These are the only two that report an outcome.
 */
function fire(run: () => Promise<void>) {
  void run().catch(() => {});
}

export const haptics = {
  /** A suggestion chip, a question from the bank, an option in a form. */
  selection: () => fire(() => Haptics.selectionAsync()),
  /** Recording started or stopped — felt, so the user can keep their eyes up. */
  edge: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A query or action came back successfully. */
  settled: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A query or action failed, or the agent could not be reached. */
  failed: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
