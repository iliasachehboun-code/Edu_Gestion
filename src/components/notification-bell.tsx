"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";

export type NotificationData = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string | Date;
};

function formatNotificationTime(dateVal: string | Date): string {
  const d = new Date(dateVal);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "GRADE":
      return {
        icon: "📊",
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        label: "Note",
      };
    case "SCHEDULE":
      return {
        icon: "📅",
        bg: "bg-amber-100 text-amber-700 border-amber-200",
        label: "Examen / Planning",
      };
    case "ATTENDANCE":
      return {
        icon: "📝",
        bg: "bg-rose-100 text-rose-700 border-rose-200",
        label: "Vie scolaire",
      };
    default:
      return {
        icon: "🔔",
        bg: "bg-[#e4ecf8] text-[#002b5b] border-[#c9d7ee]",
        label: "Information",
      };
  }
}

export function NotificationBell({
  schoolId,
  unreadCount = 0,
  notifications = [],
  variant = "light",
}: {
  schoolId: string;
  unreadCount: number;
  notifications: NotificationData[];
  variant?: "light" | "dark";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationData[]>(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Mettre à jour si les props du serveur changent
  useEffect(() => {
    setItems(notifications);
    setUnread(unreadCount);
  }, [notifications, unreadCount]);

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsReadAction(schoolId);
      router.refresh();
    });
  };

  const handleItemClick = (notification: NotificationData) => {
    if (!notification.read) {
      setUnread((c) => Math.max(0, c - 1));
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      startTransition(async () => {
        await markNotificationReadAction(schoolId, notification.id);
        router.refresh();
      });
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const buttonStyle =
    variant === "dark"
      ? "relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
      : "relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9d7ee] bg-white text-[#002b5b] shadow-2xs hover:bg-[#f4f8fc] hover:border-[#002b5b]/40 transition active:scale-95";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton Cloche */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonStyle}
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>

        {/* Badge compteur de notifications non lues */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md ring-2 ring-white animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Menu déroulant des notifications */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#c9d7ee] bg-white p-0 text-[#0c2340] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
          {/* En-tête du volet */}
          <div className="flex items-center justify-between border-b border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#002b5b]">
                🔔 Notifications
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {unread} nouvelle{unread > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[11px] font-bold text-[#002b5b] hover:text-[#001e42] hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div className="max-h-96 divide-y divide-[#f1f5f9] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5a7199]">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="font-bold text-[#002b5b]">Aucune notification</p>
                <p className="mt-1">
                  Tu seras prévenu dès qu&apos;un professeur ajoutera une note ou une date d&apos;examen.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const { icon, bg, label } = getNotificationIcon(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex items-start gap-3 p-3.5 transition cursor-pointer hover:bg-[#f4f8fc] ${
                      !n.read ? "bg-[#eef5fc]/60" : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base shadow-2xs ${bg}`}
                    >
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                          {label}
                        </span>
                        <span className="text-[10px] text-[#8a9bb5]">
                          {formatNotificationTime(n.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#0c2340] leading-snug mt-0.5">
                        {n.title}
                      </h4>

                      <p className="text-xs text-[#3d5278] line-clamp-2 mt-0.5">
                        {n.message}
                      </p>

                      {n.link && (
                        <span className="mt-1 inline-block text-[10px] font-bold text-[#002b5b] hover:underline">
                          Voir les détails &rarr;
                        </span>
                      )}
                    </div>

                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pied de page */}
          <div className="border-t border-[#eef2f7] bg-[#f8fafc] px-4 py-2.5 text-center">
            <Link
              href={`/s/${schoolId}/student/notifications`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#002b5b] hover:text-[#001e42] transition"
            >
              Voir toutes mes notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
