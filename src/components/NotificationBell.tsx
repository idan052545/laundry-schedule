"use client";

import { useState, useEffect, useCallback } from "react";
import { MdNotifications, MdNotificationsActive, MdNotificationsOff } from "react-icons/md";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    // Check browser support
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    if (Notification.permission === "granted") {
      // Check if we have an active subscription on server
      const res = await fetch("/api/push/status");
      if (res.ok) {
        const data = await res.json();
        setSubscribed(data.subscribed);
      }
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = async () => {
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (res.ok) {
        setSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
    setLoading(false);
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    }
    setLoading(false);
  };

  if (permission === "unsupported") return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || permission === "denied"}
      title={
        permission === "denied" ? "התראות חסומות בדפדפן"
        : subscribed ? "כבה התראות"
        : "הפעל התראות"
      }
      className={`p-1.5 rounded-lg transition relative ${
        permission === "denied"
          ? "text-gray-500 cursor-not-allowed opacity-50"
          : subscribed
            ? "text-dotan-gold hover:text-dotan-gold-dark"
            : "text-gray-300 hover:text-white"
      } ${loading ? "animate-pulse" : ""}`}
    >
      {permission === "denied" ? (
        <MdNotificationsOff className="text-xl" />
      ) : subscribed ? (
        <MdNotificationsActive className="text-xl" />
      ) : (
        <MdNotifications className="text-xl" />
      )}
    </button>
  );
}
