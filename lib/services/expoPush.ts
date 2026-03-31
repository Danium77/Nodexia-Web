/**
 * ============================================================================
 * Expo Push Notification Service
 * ============================================================================
 *
 * Sends push notifications via Expo Push API.
 * Reads tokens from push_tokens table using supabaseAdmin (bypasses RLS).
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a specific user by user_id.
 * Reads all active push tokens for the user and sends to each.
 * Silently fails — push is best-effort, should never break main flow.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error || !tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      sound: 'default' as const,
      data: payload.data || {},
    }));

    // Expo supports batch sending (up to 100 per request)
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error('⚠️ [expo-push] HTTP error:', res.status);
      return;
    }

    const result = await res.json();

    // Clean up invalid tokens (DeviceNotRegistered)
    if (result.data && Array.isArray(result.data)) {
      const invalidTokens: string[] = [];
      result.data.forEach((receipt: any, i: number) => {
        if (
          receipt.status === 'error' &&
          receipt.details?.error === 'DeviceNotRegistered'
        ) {
          invalidTokens.push(messages[i].to);
        }
      });

      if (invalidTokens.length > 0) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .in('token', invalidTokens);
        console.log(`🧹 [expo-push] Cleaned ${invalidTokens.length} invalid tokens`);
      }
    }
  } catch (err) {
    console.error('⚠️ [expo-push] Exception:', err);
  }
}

/**
 * Send push to multiple users at once (e.g. notify all supervisors).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (error || !tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      sound: 'default' as const,
      data: payload.data || {},
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('⚠️ [expo-push] Batch exception:', err);
  }
}
