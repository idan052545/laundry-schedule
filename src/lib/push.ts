import webPush from "web-push";
import prisma from "./prisma";
import { translateTexts } from "./translate";

webPush.setVapidDetails(
  "mailto:dotan@platoon.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  titleEn?: string;
  bodyEn?: string;
}

/**
 * Auto-translate title/body to English if not already provided
 */
async function ensureEnglish(payload: NotificationPayload): Promise<{ titleEn: string; bodyEn: string }> {
  if (payload.titleEn && payload.bodyEn) {
    return { titleEn: payload.titleEn, bodyEn: payload.bodyEn };
  }
  try {
    const toTranslate = [
      ...(!payload.titleEn ? [payload.title] : []),
      ...(!payload.bodyEn ? [payload.body] : []),
    ];
    const translated = await translateTexts(toTranslate);
    let idx = 0;
    return {
      titleEn: payload.titleEn || translated[idx++],
      bodyEn: payload.bodyEn || translated[idx],
    };
  } catch {
    return { titleEn: payload.titleEn || payload.title, bodyEn: payload.bodyEn || payload.body };
  }
}

/**
 * Log notifications to DB for notification center
 * English users get auto-translated version
 */
async function logNotificationsWithLanguage(userIds: string[], payload: NotificationPayload, enPayload: { titleEn: string; bodyEn: string }) {
  try {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, language: true },
    });
    const langMap = new Map(users.map(u => [u.id, u.language]));

    await prisma.notification.createMany({
      data: uniqueIds.map(userId => {
        const isEn = langMap.get(userId) === "en";
        return {
          userId,
          title: isEn ? enPayload.titleEn : payload.title,
          body: isEn ? enPayload.bodyEn : payload.body,
          url: payload.url || null,
          tag: payload.tag || null,
        };
      }),
    });
  } catch {
    // Don't let logging failures break push sending
  }
}

/**
 * Send push notification to specific users
 * English users get auto-translated content
 */
export async function sendPushToUsers(userIds: string[], payload: NotificationPayload) {
  const enPayload = await ensureEnglish(payload);
  await logNotificationsWithLanguage(userIds, payload, enPayload);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    include: { user: { select: { language: true } } },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const isEn = sub.user?.language === "en";
      const pushPayload = isEn
        ? { title: enPayload.titleEn, body: enPayload.bodyEn, url: payload.url, tag: payload.tag }
        : { title: payload.title, body: payload.body, url: payload.url, tag: payload.tag };
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(pushPayload)
        );
      } catch (error: unknown) {
        // Remove expired/invalid subscriptions
        if (error && typeof error === "object" && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
        throw error;
      }
    })
  );

  return results;
}

/**
 * Send push notification to all users
 * English users get auto-translated content
 */
export async function sendPushToAll(payload: NotificationPayload, excludeUserId?: string) {
  const enPayload = await ensureEnglish(payload);

  const where = excludeUserId ? { userId: { not: excludeUserId } } : {};
  const subscriptions = await prisma.pushSubscription.findMany({
    where,
    include: { user: { select: { language: true } } },
  });

  // Log to ALL users (not just those with push subscriptions)
  const allUsers = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : {},
    select: { id: true },
  });
  await logNotificationsWithLanguage(allUsers.map(u => u.id), payload, enPayload);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const isEn = sub.user?.language === "en";
      const pushPayload = isEn
        ? { title: enPayload.titleEn, body: enPayload.bodyEn, url: payload.url, tag: payload.tag }
        : { title: payload.title, body: payload.body, url: payload.url, tag: payload.tag };
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(pushPayload)
        );
      } catch (error: unknown) {
        if (error && typeof error === "object" && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
        throw error;
      }
    })
  );

  return results;
}
