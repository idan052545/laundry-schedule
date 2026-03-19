import webPush from "web-push";
import prisma from "./prisma";

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
}

/**
 * Log notifications to DB for notification center
 */
async function logNotifications(userIds: string[], payload: NotificationPayload) {
  try {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return;
    await prisma.notification.createMany({
      data: uniqueIds.map(userId => ({
        userId,
        title: payload.title,
        body: payload.body,
        url: payload.url || null,
        tag: payload.tag || null,
      })),
    });
  } catch {
    // Don't let logging failures break push sending
  }
}

/**
 * Send push notification to specific users
 */
export async function sendPushToUsers(userIds: string[], payload: NotificationPayload) {
  // Log to DB
  logNotifications(userIds, payload);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
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
 */
export async function sendPushToAll(payload: NotificationPayload, excludeUserId?: string) {
  const where = excludeUserId ? { userId: { not: excludeUserId } } : {};
  const subscriptions = await prisma.pushSubscription.findMany({ where });

  // Log to ALL users (not just those with push subscriptions)
  const allUsers = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : {},
    select: { id: true },
  });
  logNotifications(allUsers.map(u => u.id), payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
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
